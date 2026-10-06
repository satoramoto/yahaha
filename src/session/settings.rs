//! Settings: audio output, SoundFont, MIDI inputs, Launchkey LED mode; the synth and MIDI
//! as the state shows them.

use super::{Control, SynthThread};
use crate::api::{
    unmapped_text, ChangeRuleMode, ChordCmd, CmdError, ControllersCmd, EngineStats, IoState, MidiSource, MixerCmd, OtsCmd, OtsLinkTiming, SettingsCmd, SettingsState, StopAcmpMode, SynthState,
};
use crate::controllers::{PartTargets, PedalSetup, PEDALS};
use crate::engine::{AccentMode, AccentSource, Button, IntroEndingTiming, MainTiming, UnisonType};
use crate::fingering::Fingering;
use crate::launchkey::{Page, PageOrder};
use std::path::PathBuf;
use crate::library;
use crate::live::{self, Cmd, MAX_KEY_SOURCES};
use crate::midi;
use crate::parts;
use crate::synth::{self, SynthControl, SynthInfo};
use anyhow::{Context, Result};
use rtrb::Consumer;
use std::path::Path;
use std::sync::atomic::Ordering::Relaxed;
use std::sync::{mpsc, Arc};

/// The synth as the control side sees it.
pub(super) struct SynthRef {
    pub(super) info: SynthInfo,
    pub(super) control: Arc<SynthControl>,
    /// Swapping SoundFonts (None: the synth can't).
    pub(super) swap: Option<synth::RackSwap>,
    /// The plugin rack's control half (feature `plugins`; None: no plugin rack).
    #[cfg_attr(not(feature = "plugins"), allow(dead_code))]
    pub(super) plugins: Option<synth::PluginLink>,
    /// To the synth thread, which owns the audio stream (`SetAudioBuffer`). None: an
    /// offline synth (`Session::render` renders in buffers of `info.buffer`).
    pub(super) thread: Option<mpsc::Sender<SynthMsg>>,
}

/// What the synth thread is asked to do.
pub(super) enum SynthMsg {
    /// Reopen the output with this many frames per buffer; the reply is the size now used.
    Buffer(u32, mpsc::Sender<Result<Option<u32>, String>>),
    /// Close the stream and end.
    Stop,
}

/// Where a live session keeps its audio settings (the buffer size).
fn audio_settings_path() -> Option<std::path::PathBuf> {
    std::env::var_os("HOME").map(|h| std::path::PathBuf::from(h).join("Library/Application Support/yahaha/audio.json"))
}

#[derive(serde::Serialize, serde::Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct AudioSettings {
    buffer_frames: Option<u32>,
}

/// The buffer size a live session saved last time (`SetAudioBuffer`).
pub(super) fn saved_buffer() -> Option<u32> {
    let bytes = std::fs::read(audio_settings_path()?).ok()?;
    serde_json::from_slice::<AudioSettings>(&bytes).ok()?.buffer_frames.filter(|f| synth::BUFFER_CHOICES.contains(f))
}

fn save_buffer(frames: u32) {
    let Some(path) = audio_settings_path() else { return };
    if let Some(dir) = path.parent() {
        let _ = std::fs::create_dir_all(dir);
    }
    if let Ok(json) = serde_json::to_string_pretty(&AudioSettings { buffer_frames: Some(frames) }) {
        let _ = std::fs::write(path, json);
    }
}

/// What the SoundFont loader thread sends back: the rack, and the SoundFonts in it (the
/// sound library keeps them parsed for the next rack).
pub(super) type RackLoad = Result<super::sound_library::RackLoaded, String>;

/// A live session's MIDI input: the port, and which sources it listens to.
pub(super) struct MidiIo {
    pub(super) port: midi::InputPort,
    /// Keyboard sources by slot (`live::key_tag`; slot 0 is unused live).
    pub(super) slots: [Option<(midi::Endpoint, String)>; MAX_KEY_SOURCES],
    /// The Launchkey DAW port, when yahaha drives it.
    pub(super) daw: Option<(midi::Endpoint, String)>,
    /// The output port the Launchkey LEDs go out through (None with `--no-pads`).
    pub(super) leds_port: Option<midi::OutPort>,
    /// The Launchkey DAW destination the LEDs (and the DAW-mode message) last went to:
    /// None until it is online after the DAW port connected (session/devices.rs).
    pub(super) leds_dest: Option<midi::Endpoint>,
    /// `--no-pads`: leave the Launchkey DAW port alone.
    pub(super) no_pads: bool,
    /// The MIDI setup generation last followed (`midi::setup_generation`,
    /// session/devices.rs).
    pub(super) setup_gen: u64,
}

/// The Launchkey's DAW port (pads, buttons, faders), by its source name.
pub(super) fn is_daw(name: &str) -> bool {
    name.contains("Launchkey") && name.contains("DAW")
}

/// The sources (by index into `sources`) that play the keyboard: every one when `all`,
/// else those whose name contains one of `names`, else (no names) a Launchkey's keys when
/// there is one, else every one. Never yahaha's own port, never a DAW port.
pub fn choose_keys(sources: &[String], all: bool, names: &[String]) -> Vec<usize> {
    let ok: Vec<usize> = (0..sources.len()).filter(|&i| !sources[i].starts_with("yahaha") && !sources[i].contains("DAW")).collect();
    if !all && !names.is_empty() {
        return ok.into_iter().filter(|&i| names.iter().any(|n| !n.is_empty() && sources[i].contains(n.as_str()))).collect();
    }
    let lk: Vec<usize> = ok.iter().copied().filter(|&i| sources[i].contains("Launchkey")).collect();
    if all || lk.is_empty() { ok } else { lk }
}

/// Start the synth on a thread of its own, which keeps the audio stream (not `Send`)
/// until told to stop.
pub(super) fn start_synth(
    sf2: &Path,
    consumers: Vec<Consumer<synth::Msg>>,
    audio_out: Option<u8>,
    parts: Arc<parts::Parts>,
    routing: synth::Routing,
    buffer: Option<u32>,
) -> Result<(SynthRef, SynthThread)> {
    let (tx, rx) = mpsc::channel();
    let (stop, msgs) = mpsc::channel::<SynthMsg>();
    let to_thread = stop.clone();
    let sf2 = sf2.to_path_buf();
    let thread = std::thread::Builder::new().name("yahaha-synth".into()).spawn(move || match synth::start(&sf2, consumers, audio_out, parts, routing, buffer) {
        Ok(mut s) => {
            let swap = s.swap.take();
            let plugins = s.plugins.take();
            let _ = tx.send(Ok(SynthRef { info: s.info.clone(), control: s.control.clone(), swap, plugins, thread: Some(to_thread) }));
            while let Ok(SynthMsg::Buffer(frames, reply)) = msgs.recv() {
                let _ = reply.send(s.set_buffer(frames).map_err(|e| format!("{e:#}")));
            }
            drop(s);
        }
        Err(e) => {
            let _ = tx.send(Err(e));
        }
    })?;
    let r = rx.recv().context("synth thread")??;
    Ok((r, SynthThread { stop, thread }))
}

impl Control {
    pub(super) fn settings_cmd(&mut self, c: SettingsCmd) -> Result<(), CmdError> {
        match c {
            SettingsCmd::SetMidiInputs { all, names } => {
                self.all_inputs = all;
                self.input_names = names;
                self.connect_inputs();
            }
            SettingsCmd::SetPaletteLeds { on } => {
                self.palette_leds = on;
                if let Some(l) = self.leds.as_mut() {
                    l.set_palette(on);
                }
            }
            SettingsCmd::SetAudioBuffer { frames } => return self.set_audio_buffer(frames),
            SettingsCmd::SetAudioOutput { first } => {
                if let Some(s) = &self.synth {
                    let n = s.info.channels.max(2) as u8;
                    s.control.out_ch.store(first.min(n - 2), Relaxed);
                }
            }
            // Next stereo output pair: 1/2 -> 3/4 -> ... -> back to 1/2.
            SettingsCmd::NextAudioOutput => {
                if let Some(s) = &self.synth {
                    let n = s.info.channels.max(2) as u8;
                    let c = s.control.out_ch.load(Relaxed);
                    s.control.out_ch.store(if c + 4 <= n { c + 2 } else { 0 }, Relaxed);
                }
            }
        }
        Ok(())
    }

    /// Reopen the synth's output with `frames` per buffer (on the synth thread, which owns
    /// the stream) and remember it.
    fn set_audio_buffer(&mut self, frames: u32) -> Result<(), CmdError> {
        if !synth::BUFFER_CHOICES.contains(&frames) {
            return self.fail(format!("the audio buffer is 64, 128, 256, 512 or 1024 frames, not {frames}"));
        }
        let Some(sy) = self.synth.as_mut() else { return self.fail("the synth is off") };
        let Some(thread) = &sy.thread else {
            // Offline: no device; `Session::render` uses the size.
            sy.info.buffer = Some(frames);
            return Ok(());
        };
        let (tx, rx) = mpsc::channel();
        if thread.send(SynthMsg::Buffer(frames, tx)).is_err() {
            return self.fail("the synth has stopped");
        }
        let got = rx.recv_timeout(std::time::Duration::from_secs(5)).unwrap_or_else(|_| Err("the audio device did not answer".into()));
        match got {
            Ok(b) => {
                sy.info.buffer = b;
                if self.offline.is_none() {
                    save_buffer(frames);
                }
                if b.is_some_and(|b| b != frames) {
                    let b = b.unwrap_or_default();
                    self.say(format!("the audio device plays {b}-frame buffers, the nearest it allows to {frames}"), false);
                }
                Ok(())
            }
            Err(e) => self.fail(format!("audio buffer {frames}: {e}")),
        }
    }

    /// The SoundFonts in the SoundFont folder. When they change, the GM map's auto-fill
    /// (and the main font it wants) is built again.
    pub(super) fn list_sound_fonts(&mut self) {
        if let Some(dir) = &self.sf_dir {
            let fonts = library::sound_font_files(dir);
            if fonts != self.sound_fonts {
                self.sound_fonts = fonts;
                self.gm_auto_changed();
            }
        }
    }

    /// The SoundFont loader's result: hand the new rack to the audio thread.
    pub(super) fn pump_sound_font(&mut self) {
        if let Some((file, rx)) = &self.sf_load {
            match rx.try_recv() {
                Ok(Ok((rack, fonts, failed))) => {
                    self.sf_ready = Some((file.clone(), rack));
                    self.sf_load = None;
                    self.sound_library_loaded(fonts, failed);
                }
                Ok(Err(e)) => {
                    let msg = format!("SoundFont {file}: {e}");
                    // Not tried again (by the sound library's pump) until the file changes.
                    let (f, dir) = (file.clone(), self.sf_dir.clone());
                    self.sf_load = None;
                    self.sound_library_failed(&f, dir.as_deref());
                    self.say(msg, true);
                }
                Err(mpsc::TryRecvError::Empty) => {}
                Err(mpsc::TryRecvError::Disconnected) => self.sf_load = None,
            }
        }
        let Some(sy) = self.synth.as_mut() else { return };
        let Some(swap) = sy.swap.as_mut() else { return };
        while swap.old.pop().is_ok() {} // old racks are freed here, off the audio thread
        // The drum setup kits the audio thread asks for (synth/kit.rs): built on a thread
        // of their own live, at once offline (no device waits on it).
        let failed = if self.offline.is_some() {
            swap.kits.serve();
            None
        } else {
            swap.kits.pump()
        };
        if let Some(e) = failed {
            self.say(format!("Drum setup: {e}"), true);
        }
        let Some(sy) = self.synth.as_mut() else { return };
        let Some(swap) = sy.swap.as_mut() else { return };
        if let Some((file, rack)) = self.sf_ready.take() {
            match swap.tx.push(rack) {
                Ok(()) => {
                    sy.info.name = Path::new(&file).file_stem().unwrap_or_default().to_string_lossy().to_string();
                    let moved = self.sf_file.as_ref() != Some(&file);
                    self.sf_file = Some(file);
                    if moved {
                        // Another main font: the auto-fill it covers needs no route now,
                        // and what the old one covered does.
                        self.gm_routes_changed();
                    }
                }
                Err(rtrb::PushError::Full(rack)) => self.sf_ready = Some((file, rack)),
            }
        }
    }

    /// Build the drum setup kits (synth/kit.rs) that a style's setup leaves its drum parts
    /// playing as it loads, so its first downbeat has them: each section's setup, as the
    /// synth will take it.
    pub(super) fn prebuild_drum_kits(&mut self, p: &crate::engine::Prepared) {
        let Some(swap) = self.synth.as_mut().and_then(|s| s.swap.as_mut()) else { return };
        let mut plan: Vec<synth::drum_setup::Prebuild> = Vec::new();
        for s in &p.setups {
            for k in synth::drum_setup::prebuilds((0..s.init.len()).map(|i| s.init.get(i))) {
                if !plan.iter().any(|q| q.ch == k.ch && q.msb == k.msb && q.program == k.program && q.params == k.params) {
                    plan.push(k);
                }
            }
        }
        swap.kits.prebuild(plan);
    }

    /// Connect the keyboard sources `all_inputs`/`input_names` choose and disconnect the
    /// rest (and those that went offline); list every source online. A source dropped
    /// with keys held has them released.
    pub(super) fn connect_inputs(&mut self) {
        let Some(m) = self.midi.as_mut() else { return };
        let sources = midi::online_sources();
        let names: Vec<String> = sources.iter().map(|(_, n)| n.clone()).collect();
        let want: Vec<midi::Endpoint> = choose_keys(&names, self.all_inputs, &self.input_names).into_iter().map(|i| sources[i].0).collect();
        let mut dropped = Vec::new();
        for slot in 1..MAX_KEY_SOURCES {
            if let Some((e, _)) = m.slots[slot]
                && !want.contains(&e)
            {
                let _ = m.port.disconnect(e);
                m.slots[slot] = None;
                dropped.push(slot);
            }
        }
        // Queue the releases before a new source can take a freed slot: the input thread
        // applies them before that source's first packet, so they never release its keys.
        for slot in dropped {
            // A source that moved a pedal or wheel is reset too: its release never comes.
            if self.shared.src_held[slot].load(Relaxed) > 0 || self.shared.controllers.touched(slot) {
                // The input thread releases the keys (and the chord) on its next message;
                // the notes stop now.
                let _ = self.release_tx.push(slot as u8);
                let _ = self.engine_cmd(Cmd::KeysOff);
            }
        }
        let Some(m) = self.midi.as_mut() else { return };
        for e in want {
            if m.slots.iter().flatten().any(|(x, _)| *x == e) {
                continue;
            }
            let Some(slot) = (1..MAX_KEY_SOURCES).find(|&s| m.slots[s].is_none()) else { break };
            if m.port.connect(e, live::key_tag(slot)).is_ok() {
                let name = sources.iter().find(|(x, _)| *x == e).map_or_else(String::new, |(_, n)| n.clone());
                m.slots[slot] = Some((e, name));
            }
        }
        self.inputs = m.slots.iter().flatten().map(|(_, n)| n.clone()).chain(m.daw.iter().map(|(_, n)| format!("{n} (pads)"))).collect();
        self.sources = sources
            .iter()
            .filter(|(_, n)| !n.starts_with("yahaha"))
            .map(|(e, n)| MidiSource {
                name: n.clone(),
                listening: m.slots.iter().flatten().any(|(x, _)| x == e) || m.daw.as_ref().is_some_and(|(x, _)| x == e),
                pads: is_daw(n),
            })
            .collect();
    }

    pub(super) fn io_state(&self) -> IoState {
        let shared = &self.shared;
        IoState {
            output_port: if self.offline.is_some() { String::new() } else { "yahaha".into() },
            inputs: self.inputs.clone(),
            synth: self.synth.as_ref().map(|sy| {
                let c = sy.control.out_ch.load(Relaxed);
                SynthState {
                    sound_font: sy.info.name.clone(),
                    device: sy.info.device.clone(),
                    sample_rate: sy.info.sample_rate,
                    buffer_frames: sy.info.buffer,
                    channels: sy.info.channels as u32,
                    output_pair: [c + 1, c + 2],
                    muted: sy.control.muted.load(Relaxed),
                    dropouts: sy.control.dropouts(),
                }
            }),
            engine: EngineStats {
                realtime: shared.engine_rt.load(Relaxed),
                wake_p99_us: shared.lateness.percentile_us(0.99) as u32,
                chord_p99_us: shared.chord_lat.percentile_us(0.99) as u32,
                midi_in_p99_us: shared.input_lat.percentile_us(0.99) as u32,
            },
            last_control: shared.last_daw.load(Relaxed),
            unmapped: unmapped_text(shared.last_unmapped.load(Relaxed)),
            offline: self.offline.is_some(),
            sources: self.sources.clone(),
            all_inputs: self.all_inputs,
            sound_fonts: self.sound_fonts.clone(),
            sound_font_file: self.synth.as_ref().and(self.sf_file.clone()),
            sound_font_loading: self.sf_load.is_some() || self.sf_ready.is_some(),
        }
    }
}

/// The settings' file in the data folder (docs/eyes-free.md, docs/app-api.md `settings`):
/// the global settings of the Settings screen and the Setup pad page, saved whenever they
/// change and restored at start. What a rack holds (the split, Keyboard Transpose, Pitch
/// Bend Range) is the live rack's (session/live_rack.rs), the audio buffer is `audio.json`'s,
/// and Parameter Lock is `param-locks.json`'s.
const SETTINGS_FILE: &str = "settings.json";

/// A live session saves a change once the settings have been still for this long, so a
/// slider dragged (the master volume, a fade time) is written once, not on every step.
/// An offline session saves at once; stopping saves what is left.
const QUIET_NS: u64 = 500_000_000;

/// A field of `settings.json` read on its own: a value this build can't read (a newer
/// build's, a typo) is None, the default, and the file's other settings still load.
fn lenient<'de, D, T>(d: D) -> Result<Option<T>, D::Error>
where
    D: serde::Deserializer<'de>,
    T: serde::de::DeserializeOwned,
{
    let v = <serde_json::Value as serde::Deserialize>::deserialize(d)?;
    Ok(serde_json::from_value(v).ok())
}

/// `Saved`: every field optional, read leniently, and left out of the file when None.
macro_rules! saved {
    ($( $(#[doc = $doc:literal])* $name:ident: $ty:ty, )*) => {
        /// What `settings.json` holds. A missing field (or file) keeps the session's
        /// default, so a data folder from before a setting loads as it always did.
        #[derive(Clone, Debug, Default, PartialEq, serde::Serialize, serde::Deserialize)]
        #[serde(rename_all = "camelCase")]
        pub(super) struct Saved {
            $(
                $(#[doc = $doc])*
                #[serde(default, deserialize_with = "lenient", skip_serializing_if = "Option::is_none")]
                pub(super) $name: Option<$ty>,
            )*
        }
    };
}

saved! {
    /// Pad pages 2-5 in order (`setPadPageOrder`).
    pad_pages: Vec<Page>,
    // Chord & Split.
    fingering: Fingering,
    /// Chord Detection Area Upper (false: Lower).
    upper: bool,
    manual_bass: bool,
    left_hold: bool,
    chord_settle_ms: u32,
    // Style.
    ots_link: bool,
    ots_link_timing: OtsLinkTiming,
    stop_acmp_mode: StopAcmpMode,
    main_timing: MainTiming,
    intro_ending_timing: IntroEndingTiming,
    sync_stop_window_ms: u16,
    fade_in_ms: u16,
    fade_out_ms: u16,
    fade_hold_ms: u16,
    section_reset: bool,
    retrigger_rate: u8,
    swing_grid: u8,
    section_tempo: bool,
    tempo_change: ChangeRuleMode,
    parts_change: ChangeRuleMode,
    /// Section Set: the Main (0-3), or null for Off.
    section_set: Option<u8>,
    auto_fill: bool,
    half_bar_fill: bool,
    unison_type: UnisonType,
    dynamics_control: bool,
    touch: bool,
    accent: bool,
    accent_threshold: u8,
    accent_mode: AccentMode,
    accent_source: AccentSource,
    // Keyboard (Keyboard Transpose is the rack's).
    master_transpose: i8,
    // Pedals (Pitch Bend Range is the rack's).
    pedals: [PedalSetup; PEDALS],
    /// Per keyboard part: which controllers reach it.
    part_controllers: [Reach; 4],
    // System.
    synth_muted: bool,
    /// The synth's output pair, its first channel 0-based (`setAudioOutput`).
    audio_output: u8,
    master_volume: u8,
    all_inputs: bool,
    input_names: Vec<String>,
    palette_leds: bool,
}

/// Which controllers reach a keyboard part (`setPartControllers`).
#[derive(Clone, Copy, Debug, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct Reach {
    sustain: bool,
    pitch_bend: bool,
    modulation: bool,
}

impl From<PartTargets> for Reach {
    fn from(t: PartTargets) -> Reach {
        Reach { sustain: t.sustain, pitch_bend: t.pitch_bend, modulation: t.modulation }
    }
}

/// The saved settings the engine keeps (its snapshot shows them).
#[derive(Clone, Copy, Debug, PartialEq)]
struct EngineSwitches {
    stop_acmp_mode: StopAcmpMode,
    auto_fill: bool,
    half_bar_fill: bool,
    unison_type: UnisonType,
}

impl EngineSwitches {
    fn of(s: &crate::engine::Snapshot) -> EngineSwitches {
        EngineSwitches { stop_acmp_mode: s.stop_acmp_mode.into(), auto_fill: s.auto_fill, half_bar_fill: s.half_bar_fill, unison_type: s.unison_type }
    }
}

/// `settings.json` and what was last saved to it.
#[derive(Default)]
pub(super) struct SettingsFile {
    /// None: not saved (sessions without a data folder).
    path: Option<PathBuf>,
    /// What the file says (after a start, with what it left out filled in as the session
    /// started: an older file is not rewritten until a setting changes).
    saved: Saved,
    /// The engine switches restored at start, until the engine's snapshot shows them (the
    /// engine applies them on its next wake): meanwhile the snapshot's defaults are not a
    /// change.
    pending: Option<EngineSwitches>,
    /// A change not saved yet, and when it was last seen to change.
    unsaved: Option<(Saved, u64)>,
}

impl SettingsFile {
    /// The settings saved in `data_dir` (none when there is no file or it can't be read).
    pub(super) fn load(data_dir: Option<&Path>) -> SettingsFile {
        let Some(dir) = data_dir else { return SettingsFile::default() };
        let path = dir.join(SETTINGS_FILE);
        let saved = std::fs::read_to_string(&path).ok().and_then(|t| serde_json::from_str::<Saved>(&t).ok());
        SettingsFile { path: Some(path), saved: saved.unwrap_or_default(), ..SettingsFile::default() }
    }
}

/// `saved` with the fields it leaves out taken from `now`.
fn filled(saved: &Saved, now: &Saved) -> Saved {
    let (Ok(serde_json::Value::Object(mut a)), Ok(serde_json::Value::Object(b))) = (serde_json::to_value(saved), serde_json::to_value(now)) else {
        return now.clone();
    };
    for (k, v) in b {
        a.entry(k).or_insert(v);
    }
    serde_json::from_value(serde_json::Value::Object(a)).unwrap_or_else(|_| now.clone())
}

impl Control {
    /// Put the saved settings into effect (at start, before the synth starts and the MIDI
    /// inputs connect; the synth's own settings follow in `restore_synth_settings`, Master
    /// Transpose in `start_transpose`). A setting given on the command line (`opts`: the
    /// MIDI inputs, palette LEDs) wins over the saved one.
    pub(super) fn restore_settings(&mut self, opts: &super::Options) {
        let s = self.settings.saved.clone();
        if let Some(order) = s.pad_pages.as_deref().and_then(PageOrder::new) {
            self.shared.page_order.store(order.to_bits(), Relaxed);
        }
        if let Some(fingering) = s.fingering {
            let _ = self.chord_cmd(ChordCmd::SetFingering { fingering });
        }
        if let Some(on) = s.upper {
            let _ = self.chord_cmd(ChordCmd::SetUpper { on });
        }
        // After Upper, which turns Manual Bass on.
        if let Some(on) = s.manual_bass {
            let _ = self.chord_cmd(ChordCmd::SetManualBass { on });
        }
        if let Some(on) = s.left_hold {
            let _ = self.chord_cmd(ChordCmd::SetLeftHold { on });
        }
        if let Some(ms) = s.chord_settle_ms {
            let _ = self.chord_cmd(ChordCmd::SetChordSettle { ms });
        }
        if let Some(on) = s.ots_link {
            let _ = self.ots_cmd(OtsCmd::SetOtsLink { on });
        }
        if let Some(timing) = s.ots_link_timing {
            let _ = self.ots_cmd(OtsCmd::SetOtsLinkTiming { timing });
        }

        // Style settings (Swing is the style's: each style load sets it back to 0).
        let mut st = self.style_settings;
        macro_rules! take {
            ($into:ident: $($f:ident),*) => { $( if let Some(v) = s.$f { $into.$f = v; } )* };
        }
        take!(st: main_timing, intro_ending_timing, sync_stop_window_ms, fade_in_ms, fade_out_ms, fade_hold_ms, section_reset, retrigger_rate, swing_grid, section_tempo);
        let st = st.clamped();
        if st != self.style_settings && self.engine_cmd(Cmd::StyleSettings(st)).is_ok() {
            self.style_settings = st;
        }
        let mut ch = self.style_change;
        if let Some(v) = s.tempo_change {
            ch.tempo = v;
        }
        if let Some(v) = s.parts_change {
            ch.parts = v;
        }
        if let Some(v) = s.section_set {
            ch.section_set = v.map(|m| m.min(3));
        }
        if ch != self.style_change && self.engine_cmd(Cmd::ChangeRules(ch.into())).is_ok() {
            self.style_change = ch;
        }
        // Dynamics (the level is the style's: each style load sets it back).
        let mut d = self.dynamics;
        if let Some(v) = s.dynamics_control {
            d.control = v;
        }
        if let Some(v) = s.accent_threshold {
            d.accent_min = v;
        }
        take!(d: touch, accent, accent_mode, accent_source);
        if d != self.dynamics {
            let _ = self.set_dynamics(d.clamped());
        }

        // The switches the engine keeps: sent now, applied on its next wake.
        let was = EngineSwitches::of(&self.snap);
        let mut want = was;
        if let Some(mode) = s.stop_acmp_mode
            && mode != was.stop_acmp_mode
            && self.engine_cmd(Cmd::Button(Button::SetStopAcmp(mode.into()))).is_ok()
        {
            want.stop_acmp_mode = mode;
        }
        if let Some(on) = s.auto_fill
            && on != was.auto_fill
            && self.engine_cmd(Cmd::Button(Button::AutoFill)).is_ok()
        {
            want.auto_fill = on;
        }
        if let Some(on) = s.half_bar_fill
            && on != was.half_bar_fill
            && self.engine_cmd(Cmd::Button(Button::SetHalfBarFill(on))).is_ok()
        {
            want.half_bar_fill = on;
        }
        if let Some(ty) = s.unison_type
            && ty != was.unison_type
            && self.engine_cmd(Cmd::Button(Button::SetUnisonType(ty))).is_ok()
        {
            want.unison_type = ty;
        }
        if want != was {
            self.settings.pending = Some(want);
        }

        if let Some(pedals) = s.pedals {
            for (i, p) in pedals.into_iter().enumerate() {
                if self.shared.controllers.pedal(i) != p {
                    let (cc, function, control_type, reverse, range) = (p.cc, p.function, p.control_type, p.reverse, p.range);
                    let _ = self.controllers_cmd(ControllersCmd::SetPedal { pedal: i as u8, cc, function, control_type, reverse, range });
                }
            }
        }
        if let Some(reach) = s.part_controllers {
            for (i, r) in reach.into_iter().enumerate() {
                if Reach::from(self.shared.controllers.part_targets(i)) != r {
                    let (sustain, pitch_bend, modulation) = (r.sustain, r.pitch_bend, r.modulation);
                    let _ = self.controllers_cmd(ControllersCmd::SetPartControllers { part: i as u8, sustain, pitch_bend, modulation });
                }
            }
        }
        if !opts.all_inputs && opts.inputs.is_empty() {
            if let Some(all) = s.all_inputs {
                self.all_inputs = all;
            }
            if let Some(names) = s.input_names {
                self.input_names = names;
            }
        }
        if !opts.palette_leds
            && let Some(on) = s.palette_leds
        {
            self.palette_leds = on;
        }
        self.settings_settled();
    }

    /// The transpose a session starts with: the keyboard's from `opts` (the live rack
    /// restores its own later), Master Transpose from `opts` when given, else the saved one.
    pub(super) fn start_transpose(&self, opts: &super::Options) -> crate::engine::Transpose {
        let master = if opts.transpose.master != 0 { opts.transpose.master } else { self.settings.saved.master_transpose.unwrap_or(0) };
        crate::engine::Transpose::new(opts.transpose.keyboard, master)
    }

    /// Put the synth's saved settings into effect, once it runs: the master volume, synth
    /// on/off, and the output pair (unless `--out` gave one: `audio_out_given`).
    pub(super) fn restore_synth_settings(&mut self, audio_out_given: bool) {
        if self.synth.is_none() {
            return;
        }
        let s = self.settings.saved.clone();
        if let Some(volume) = s.master_volume {
            let _ = self.mixer_cmd(MixerCmd::SetMasterVolume { volume });
        }
        if let Some(on) = s.synth_muted {
            let _ = self.mixer_cmd(MixerCmd::SetSynthMuted { on });
        }
        if !audio_out_given && let Some(first) = s.audio_output {
            let _ = self.settings_cmd(SettingsCmd::SetAudioOutput { first });
        }
        self.settings_settled();
    }

    /// After a restore: what the file left out is as the session has it, so an older file
    /// is not rewritten until a setting changes (and no file is written for defaults).
    fn settings_settled(&mut self) {
        let now = self.settings_now();
        self.settings.saved = filled(&self.settings.saved, &now);
    }

    /// The settings as they are now. The synth's, while there is none, are as saved.
    fn settings_now(&mut self) -> Saved {
        let snap = EngineSwitches::of(&self.snap);
        let f = &mut self.settings;
        if f.pending == Some(snap) {
            f.pending = None;
        }
        let eng = f.pending.unwrap_or(snap);
        let saved = &f.saved;
        let ctl = &self.shared.controllers;
        let st = self.style_settings;
        let d = self.dynamics;
        let (synth_muted, audio_output, master_volume) = match &self.synth {
            Some(sy) => (Some(sy.control.muted.load(Relaxed)), Some(sy.control.out_ch.load(Relaxed)), Some(sy.control.master.load(Relaxed))),
            None => (saved.synth_muted, saved.audio_output, saved.master_volume),
        };
        Saved {
            pad_pages: Some(self.shared.page_order().movable().collect()),
            fingering: Some(Fingering::from_u8(self.shared.fingering.load(Relaxed))),
            upper: Some(self.shared.upper.load(Relaxed)),
            manual_bass: Some(self.shared.manual_bass.load(Relaxed)),
            left_hold: Some(ctl.left_hold()),
            chord_settle_ms: Some(self.chord_settle_ms),
            ots_link: Some(self.shared.parts.ots_link.load(Relaxed)),
            ots_link_timing: Some(self.ots_timing),
            stop_acmp_mode: Some(eng.stop_acmp_mode),
            main_timing: Some(st.main_timing),
            intro_ending_timing: Some(st.intro_ending_timing),
            sync_stop_window_ms: Some(st.sync_stop_window_ms),
            fade_in_ms: Some(st.fade_in_ms),
            fade_out_ms: Some(st.fade_out_ms),
            fade_hold_ms: Some(st.fade_hold_ms),
            section_reset: Some(st.section_reset),
            retrigger_rate: Some(st.retrigger_rate),
            swing_grid: Some(st.swing_grid),
            section_tempo: Some(st.section_tempo),
            tempo_change: Some(self.style_change.tempo),
            parts_change: Some(self.style_change.parts),
            section_set: Some(self.style_change.section_set),
            auto_fill: Some(eng.auto_fill),
            half_bar_fill: Some(eng.half_bar_fill),
            unison_type: Some(eng.unison_type),
            dynamics_control: Some(d.control),
            touch: Some(d.touch),
            accent: Some(d.accent),
            accent_threshold: Some(d.accent_min),
            accent_mode: Some(d.accent_mode),
            accent_source: Some(d.accent_source),
            master_transpose: Some(self.transpose.master),
            pedals: Some(std::array::from_fn(|i| ctl.pedal(i))),
            part_controllers: Some(std::array::from_fn(|i| ctl.part_targets(i).into())),
            synth_muted,
            audio_output,
            master_volume,
            all_inputs: Some(self.all_inputs),
            input_names: Some(self.input_names.clone()),
            palette_leds: Some(self.palette_leds),
        }
    }

    /// Save the settings when they changed, however they were changed (the app, a
    /// Launchkey pad or fader, a pedal, a rack): offline at once, live once they have been
    /// still for [`QUIET_NS`]. On the control thread, never the engine's or the audio's.
    pub(super) fn pump_settings(&mut self, now_ns: u64) {
        let now = self.settings_now();
        if self.settings.path.is_none() || now == self.settings.saved {
            self.settings.unsaved = None;
            return;
        }
        let quiet = match &self.settings.unsaved {
            Some((u, since)) if *u == now => now_ns.saturating_sub(*since) >= QUIET_NS,
            _ => {
                self.settings.unsaved = Some((now.clone(), now_ns));
                false
            }
        };
        if quiet || self.offline.is_some() {
            self.save_settings(now);
        }
    }

    /// Save a change not saved yet (the session is stopping).
    pub(super) fn flush_settings(&mut self) {
        let now = self.settings_now();
        if self.settings.path.is_some() && now != self.settings.saved {
            self.save_settings(now);
        }
    }

    fn save_settings(&mut self, now: Saved) {
        let Some(path) = &self.settings.path else { return };
        let r = serde_json::to_string_pretty(&now).map_err(anyhow::Error::from).and_then(|j| crate::data_files::write_atomic(path, &j));
        // Saved or not, don't try again until the next change: a failing disk would
        // otherwise be written (and reported) on every pump.
        self.settings.saved = now;
        self.settings.unsaved = None;
        if let Err(e) = r {
            self.say(format!("saving the settings: {e:#}"), true);
        }
    }

    /// The saved settings as the state shows them.
    pub(super) fn settings_state(&self) -> SettingsState {
        SettingsState { pad_pages: self.shared.page_order().movable().collect() }
    }
}

#[cfg(test)]
#[path = "settings_tests.rs"]
mod tests;
