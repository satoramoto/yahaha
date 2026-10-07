//! `settings.json` as a player's data folder holds it (docs/eyes-free.md): a file written
//! by hand, or by an older build, starts the session with its pad page order and its Setup
//! switches, lit on the Setup page and walked by Pad Bank.

use crate::api::{PadsCmd, StopAcmpMode};
use crate::fingering::Fingering;
use crate::launchkey::{Level, Page, PAD_DOWN_CC, PAD_UP_CC};
use crate::session::testing;
use crate::session::{Options, Port, Session};
use std::path::Path;

const MS: u64 = 1_000_000;

fn start(data: &Path) -> Session {
    let s = Session::offline(Options { paths: vec![testing::style_path()], data_dir: Some(data.to_path_buf()), ..Options::default() }).unwrap();
    // The engine applies a restored Stop ACMP mode on its next wake.
    s.advance(10 * MS);
    s
}

fn write(data: &Path, json: &str) {
    std::fs::create_dir_all(data).unwrap();
    std::fs::write(data.join("settings.json"), json).unwrap();
}

/// Every switch and the order come from the file, and the Setup pads light as they are.
#[test]
fn a_settings_file_starts_the_session_with_its_switches_and_order() {
    let data = testing::data_dir("settings-file");
    let json = r#"{
  "padPages": ["setup", "multiPads", "racks"],
  "fingering": "aiFingered",
  "upper": true,
  "otsLink": true,
  "stopAcmpMode": "style"
}"#;
    write(&data, json);
    let s = start(&data);
    let st = s.state();
    assert_eq!(st.chord.fingering, Fingering::AiFingered);
    assert!(st.chord.upper, "Upper");
    assert!(st.ots.link, "OTS Link");
    assert_eq!(st.transport.stop_acmp_mode, StopAcmpMode::Style);
    assert_eq!(st.settings.pad_pages, [Page::Setup, Page::MultiPads, Page::Racks]);
    let names: Vec<_> = st.pads.pages.iter().map(|p| p.name.as_str()).collect();
    assert_eq!(names, ["Sections", "Setup", "Multi Pads", "Racks"], "Chord trimmed");

    // Pad Bank ▼ walks the saved order from Sections; ▲ walks it back.
    s.midi_in(Port::Pads, &[0xB0, PAD_DOWN_CC, 127]);
    let st = s.state();
    assert_eq!((st.pads.page, st.pads.page_number, st.pads.page_count), (Page::Setup, 2, 4));
    // The Setup page lights the restored switches: AI Fingered (the fifth type), Upper,
    // OTS Link and ACMP STYLE bright; the other types and ACMP FIXED dim.
    let lit: Vec<(&str, Level)> = st.pads.pads.iter().map(|p| (p.label.as_str(), p.level)).collect();
    let bright: Vec<&str> = lit.iter().filter(|(_, l)| *l == Level::Bright).map(|(n, _)| *n).collect();
    assert_eq!(bright, ["AI FING", "UPPER", "OTS LINK", "ACMP STYLE"], "{lit:?}");
    assert_eq!(lit[10], ("ACMP FIXED", Level::Dim));
    s.midi_in(Port::Pads, &[0xB0, PAD_DOWN_CC, 127]);
    assert_eq!(s.state().pads.page, Page::MultiPads);
    s.midi_in(Port::Pads, &[0xB0, PAD_DOWN_CC, 127]);
    assert_eq!(s.state().pads.page, Page::Racks);
    s.midi_in(Port::Pads, &[0xB0, PAD_UP_CC, 127]);
    assert_eq!(s.state().pads.page, Page::MultiPads);
    // Tab (cyclePadPage) walks it too, wrapping past the end to Sections.
    s.send(PadsCmd::CyclePadPage { delta: 1 }).unwrap();
    s.send(PadsCmd::CyclePadPage { delta: 1 }).unwrap();
    assert_eq!(s.state().pads.page, Page::Sections);
    assert!(s.send(PadsCmd::SetPadPage { page: Page::Chord }).is_err(), "Chord was trimmed");

    // Nothing changed, so the file is left as it was written.
    drop(s);
    let text = std::fs::read_to_string(data.join("settings.json")).unwrap();
    assert_eq!(text, json, "the file was rewritten");
    let _ = std::fs::remove_dir_all(&data);
}

/// Each switch round-trips on its own: set it, restart, and it is back; the others keep
/// their defaults.
#[test]
fn each_setup_switch_round_trips_through_a_restart() {
    use crate::api::{ChordCmd, OtsCmd};
    type Check = fn(&crate::api::AppState) -> bool;
    let cases: [(&str, crate::api::AppCmd, Check); 4] = [
        ("fingering", ChordCmd::SetFingering { fingering: Fingering::FullKeyboard }.into(), |st| st.chord.fingering == Fingering::FullKeyboard),
        ("upper", ChordCmd::SetUpper { on: true }.into(), |st| st.chord.upper),
        ("ots-link", OtsCmd::SetOtsLink { on: true }.into(), |st| st.ots.link),
        (
            "stop-acmp",
            crate::api::AppCmd::Transport(crate::api::TransportCmd::SetStopAcmp { mode: StopAcmpMode::Fixed }),
            |st| st.transport.stop_acmp_mode == StopAcmpMode::Fixed,
        ),
    ];
    for (name, cmd, check) in cases {
        let data = testing::data_dir(&format!("setup-switch-{name}"));
        let s = start(&data);
        assert!(!check(&s.state()), "{name}: not the default");
        s.send(cmd).unwrap();
        s.advance(10 * MS);
        assert!(check(&s.state()), "{name}: set");
        drop(s);
        let s = start(&data);
        let st = s.state();
        assert!(check(&st), "{name}: restored");
        let others = (st.chord.fingering, st.chord.upper, st.ots.link, st.transport.stop_acmp_mode);
        let defaults = (Fingering::FingeredOnBass, false, false, StopAcmpMode::Off);
        let changed = [others.0 != defaults.0, others.1 != defaults.1, others.2 != defaults.2, others.3 != defaults.3];
        assert_eq!(changed.iter().filter(|c| **c).count(), 1, "{name}: only it changed: {others:?}");
        assert_eq!(st.settings.pad_pages, [Page::Racks, Page::Chord, Page::MultiPads, Page::Setup], "{name}: the default order");
        drop(s);
        let _ = std::fs::remove_dir_all(&data);
    }
}

/// The Chord and Setup pages as the app and the Launchkey see them: the pads the design
/// note gives each page, where the contract put them, and no dead pad (a labelled pad
/// always does something; a dark one does nothing).
#[test]
fn chord_and_setup_pages_have_their_switches_and_no_dead_pads() {
    let s = testing::session();
    let labels = |page| {
        s.send(PadsCmd::SetPadPage { page }).unwrap();
        let st = s.state();
        for p in &st.pads.pads {
            assert_eq!(p.label.is_empty(), p.action.is_none(), "{page:?} pad {}: {:?}", p.note, p.label);
            if p.action.is_none() {
                assert_eq!(p.level, Level::Off, "{page:?} pad {}: a pad that does nothing is dark", p.note);
            }
        }
        st.pads.pads.iter().map(|p| p.label.clone()).collect::<Vec<_>>()
    };
    let chord = labels(Page::Chord);
    assert!(chord[..8].iter().all(String::is_empty), "the top row is dark: {chord:?}");
    assert_eq!(chord[8..], ["MAN BASS", "STOP ACMP", "SPLIT -", "SPLIT +", "KBD TR -", "KBD TR +", "TR RESET", "RETRIG"]);
    assert_eq!(s.state().pads.pads[8].level, Level::Off, "Manual Bass is unavailable in Lower");
    s.send(crate::api::ChordCmd::SetUpper { on: true }).unwrap();
    labels(Page::Chord);
    assert_ne!(s.state().pads.pads[8].level, Level::Off, "and available in Upper");
    let setup = labels(Page::Setup);
    assert_eq!(setup[..8], ["SINGLE", "FINGERED", "ON BASS", "MULTI", "AI FING", "FULL KBD", "AI FULL", "UPPER"]);
    assert_eq!(setup[8..], ["OTS LINK", "ACMP STYLE", "ACMP FIXED", "", "", "", "", ""]);
}

/// A file with only some settings (an older build's), or an order the session refuses,
/// keeps the defaults for the rest; an unreadable file is ignored, not fatal.
#[test]
fn a_partial_or_bad_settings_file_keeps_the_defaults() {
    let data = testing::data_dir("settings-partial");
    write(&data, r#"{ "upper": true, "padPages": ["racks", "racks"] }"#);
    let s = start(&data);
    let st = s.state();
    assert!(st.chord.upper);
    assert_eq!(st.chord.fingering, Fingering::FingeredOnBass);
    assert_eq!(st.settings.pad_pages, [Page::Racks, Page::Chord, Page::MultiPads, Page::Setup], "a duplicate order is refused");
    drop(s);

    write(&data, "not json");
    let s = start(&data);
    let st = s.state();
    assert!(!st.chord.upper);
    assert_eq!(st.settings.pad_pages.len(), 4);
    drop(s);
    let _ = std::fs::remove_dir_all(&data);
}

type Check = fn(&crate::api::AppState) -> bool;

/// Each group of the Settings screen's settings round-trips on its own: set it, restart,
/// and it is back.
#[test]
fn each_settings_group_round_trips_through_a_restart() {
    use crate::api::*;
    use crate::controllers::{ControlType, Function, Range};
    use crate::engine::{AccentMode, AccentSource, IntroEndingTiming, MainTiming, UnisonType};
    let cases: Vec<(&str, Vec<AppCmd>, Check)> = vec![
        (
            "chord",
            vec![
                ChordCmd::SetUpper { on: true }.into(),
                ChordCmd::SetManualBass { on: false }.into(),
                ChordCmd::SetLeftHold { on: true }.into(),
                ChordCmd::SetChordSettle { ms: 25 }.into(),
            ],
            |st| st.chord.upper && !st.chord.manual_bass && st.chord.left_hold && st.chord.settle_ms == 25,
        ),
        ("ots-link-timing", vec![OtsCmd::SetOtsLinkTiming { timing: OtsLinkTiming::Immediate }.into()], |st| st.ots.link_timing == OtsLinkTiming::Immediate),
        (
            "style-settings",
            vec![
                StyleSettingsCmd::SetMainTiming { timing: MainTiming::Immediate }.into(),
                StyleSettingsCmd::SetIntroEndingTiming { timing: IntroEndingTiming::EndOfSection }.into(),
                StyleSettingsCmd::SetSyncStopWindow { ms: 1200 }.into(),
                StyleSettingsCmd::SetFadeInTime { ms: 3000 }.into(),
                StyleSettingsCmd::SetFadeOutTime { ms: 4000 }.into(),
                StyleSettingsCmd::SetFadeHoldTime { ms: 500 }.into(),
                StyleSettingsCmd::SetSectionReset { on: false }.into(),
                StyleSettingsCmd::SetRetriggerRate { rate: 16 }.into(),
                StyleSettingsCmd::SetSwingGrid { grid: 16 }.into(),
                StyleSettingsCmd::SetSectionTempo { on: false }.into(),
            ],
            |st| {
                let s = &st.style_settings;
                (s.main_timing, s.intro_ending_timing, s.sync_stop_window_ms, s.fade_in_ms, s.fade_out_ms, s.fade_hold_ms)
                    == (MainTiming::Immediate, IntroEndingTiming::EndOfSection, 1200, 3000, 4000, 500)
                    && (s.section_reset, s.retrigger_rate, s.swing_grid, s.section_tempo) == (false, 16, 16, false)
            },
        ),
        (
            "change-behavior",
            vec![
                StyleChangeCmd::SetTempoChange { rule: ChangeRuleMode::Lock }.into(),
                StyleChangeCmd::SetPartsChange { rule: ChangeRuleMode::Reset }.into(),
                StyleChangeCmd::SetSectionSet { section: Some(2) }.into(),
            ],
            |st| (st.style_change.tempo, st.style_change.parts, st.style_change.section_set) == (ChangeRuleMode::Lock, ChangeRuleMode::Reset, Some(2)),
        ),
        (
            "engine-switches",
            vec![
                TransportCmd::ToggleAutoFill.into(),
                TransportCmd::SetHalfBarFill { on: true }.into(),
                TransportCmd::SetUnisonType { unison_type: UnisonType::Melody }.into(),
            ],
            // Auto Fill is on by default.
            |st| !st.transport.auto_fill && st.transport.half_bar_fill && st.transport.unison_type == UnisonType::Melody,
        ),
        (
            "dynamics",
            vec![
                DynamicsCmd::SetDynamicsControl { on: false }.into(),
                DynamicsCmd::SetDynamicsTouch { on: true }.into(),
                DynamicsCmd::SetAccent { on: true }.into(),
                DynamicsCmd::SetAccentThreshold { velocity: 90 }.into(),
                DynamicsCmd::SetAccentMode { mode: AccentMode::Fill }.into(),
                DynamicsCmd::SetAccentSource { source: AccentSource::Both }.into(),
            ],
            |st| {
                let d = &st.dynamics;
                (d.control, d.touch, d.accent, d.accent_threshold, d.accent_mode, d.accent_source) == (false, true, true, 90, AccentMode::Fill, AccentSource::Both)
            },
        ),
        ("master-transpose", vec![ChordCmd::StepTranspose { keyboard: 0, master: 3 }.into()], |st| st.chord.transpose_master == 3),
        (
            "pedals",
            vec![
                ControllersCmd::SetPedal { pedal: 2, cc: Some(70), function: Function::FillUp, control_type: ControlType::Toggle, reverse: true, range: Range::Full }.into(),
                ControllersCmd::SetPartControllers { part: 3, sustain: false, pitch_bend: false, modulation: true }.into(),
            ],
            |st| {
                let p = &st.controllers.pedals[2];
                let l = &st.controllers.parts[3];
                (p.cc, p.function, p.control_type, p.reverse, p.range) == (Some(70), Function::FillUp, ControlType::Toggle, true, Range::Full)
                    && (l.sustain, l.pitch_bend, l.modulation) == (false, false, true)
            },
        ),
        (
            "midi",
            vec![SettingsCmd::SetMidiInputs { all: true, names: vec!["Piano".into()] }.into(), SettingsCmd::SetPaletteLeds { on: true }.into()],
            |st| st.io.all_inputs && st.pads.palette_leds,
        ),
    ];
    for (name, cmds, check) in cases {
        let data = testing::data_dir(&format!("settings-group-{name}"));
        let s = start(&data);
        assert!(!check(&s.state()), "{name}: not the default");
        for c in cmds {
            s.send(c).unwrap();
        }
        s.advance(10 * MS);
        assert!(check(&s.state()), "{name}: set");
        drop(s);
        let s = start(&data);
        assert!(check(&s.state()), "{name}: restored");
        // And once more: a restored setting is saved as it is, not as the defaults.
        drop(s);
        let s = start(&data);
        assert!(check(&s.state()), "{name}: restored again");
        drop(s);
        let _ = std::fs::remove_dir_all(&data);
    }
}

/// The synth's settings (the master volume, synth on/off) come back when it starts.
#[test]
fn the_synths_settings_round_trip_through_a_restart() {
    use crate::api::MixerCmd;
    let data = testing::data_dir("settings-synth");
    let s = start(&data);
    s.offline_audio(None, 48_000).unwrap();
    let st = s.state();
    assert_ne!(st.mixer.master, Some(90));
    assert!(!st.io.synth.as_ref().unwrap().muted);
    s.send(MixerCmd::SetMasterVolume { volume: 90 }).unwrap();
    s.send(MixerCmd::SetSynthMuted { on: true }).unwrap();
    drop(s);
    let s = start(&data);
    assert_eq!(s.state().mixer.master, None, "no synth yet");
    s.offline_audio(None, 48_000).unwrap();
    let st = s.state();
    assert_eq!(st.mixer.master, Some(90));
    assert!(st.io.synth.as_ref().unwrap().muted);
    drop(s);
    // A session that never starts the synth keeps them for the next that does.
    let s = start(&data);
    s.send(crate::api::ChordCmd::SetLeftHold { on: true }).unwrap();
    drop(s);
    let s = start(&data);
    s.offline_audio(None, 48_000).unwrap();
    assert_eq!(s.state().mixer.master, Some(90));
    drop(s);
    let _ = std::fs::remove_dir_all(&data);
}

/// Swing and the Dynamics level are the style's (each style load sets them back), so a
/// restart starts them as written, whatever was playing.
#[test]
fn swing_and_the_dynamics_level_are_not_saved() {
    use crate::api::{DynamicsCmd, StyleSettingsCmd};
    let data = testing::data_dir("settings-per-style");
    let s = start(&data);
    s.send(StyleSettingsCmd::SetSwing { amount: 40 }).unwrap();
    s.send(DynamicsCmd::SetDynamics { level: 60 }).unwrap();
    s.send(StyleSettingsCmd::SetFadeInTime { ms: 3000 }).unwrap();
    drop(s);
    let s = start(&data);
    let st = s.state();
    assert_eq!((st.style_settings.swing, st.dynamics.level, st.style_settings.fade_in_ms), (0, 127, 3000));
    drop(s);
    let text = std::fs::read_to_string(data.join("settings.json")).unwrap();
    assert!(!text.contains("swing\"") && !text.contains("\"level"), "{text}");
    let _ = std::fs::remove_dir_all(&data);
}

/// An older file (only the Setup switches) loads with the defaults for everything else and
/// is left as it is; a value this build can't read is dropped on its own, the rest of the
/// file still loads.
#[test]
fn an_older_file_or_an_unreadable_value_keeps_the_rest() {
    let data = testing::data_dir("settings-migrate");
    let old = r#"{
  "fingering": "fullKeyboard",
  "otsLink": true
}"#;
    write(&data, old);
    let s = start(&data);
    let st = s.state();
    assert_eq!(st.chord.fingering, Fingering::FullKeyboard);
    assert!(st.ots.link);
    assert_eq!(st.style_settings, crate::api::StyleSettingsState::default());
    assert!(st.transport.auto_fill, "on by default");
    drop(s);
    assert_eq!(std::fs::read_to_string(data.join("settings.json")).unwrap(), old, "an unchanged older file is not rewritten");

    write(&data, r#"{ "fadeInMs": "slow", "pedals": [1, 2], "autoFill": false, "masterTranspose": -2, "fingering": "noSuchType" }"#);
    let s = start(&data);
    let st = s.state();
    assert_eq!(st.style_settings.fade_in_ms, crate::api::StyleSettingsState::default().fade_in_ms);
    assert!(!st.transport.auto_fill);
    assert_eq!(st.chord.transpose_master, -2);
    assert_eq!(st.chord.fingering, Fingering::FingeredOnBass);
    // A change rewrites the file whole, with what it couldn't read as the session has it.
    s.send(crate::api::ChordCmd::SetLeftHold { on: true }).unwrap();
    drop(s);
    let saved: serde_json::Value = serde_json::from_str(&std::fs::read_to_string(data.join("settings.json")).unwrap()).unwrap();
    assert_eq!(saved["leftHold"], true);
    assert_eq!(saved["autoFill"], false);
    assert_eq!(saved["fingering"], "fingeredOnBass");
    assert!(saved["fadeInMs"].is_u64(), "{saved}");
    assert_eq!(saved["pedals"].as_array().map(Vec::len), Some(3));
    let _ = std::fs::remove_dir_all(&data);
}

/// A setting given at launch (the MIDI inputs, palette LEDs, Master Transpose) wins over
/// the saved one.
#[test]
fn a_launch_option_wins_over_the_saved_setting() {
    let data = testing::data_dir("settings-options");
    write(&data, r#"{ "paletteLeds": false, "allInputs": false, "inputNames": ["Piano"], "masterTranspose": 4 }"#);
    let opts = Options {
        paths: vec![testing::style_path()],
        data_dir: Some(data.clone()),
        palette_leds: true,
        all_inputs: true,
        transpose: crate::engine::Transpose::new(0, -1),
        ..Options::default()
    };
    let s = Session::offline(opts).unwrap();
    let st = s.state();
    assert!(st.pads.palette_leds && st.io.all_inputs);
    assert_eq!(st.chord.transpose_master, -1);
    drop(s);
    let _ = std::fs::remove_dir_all(&data);
}
