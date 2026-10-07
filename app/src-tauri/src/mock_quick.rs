//! Quick Racks in the dev mock (docs/app-api.md › Quick Racks), kept in memory: press
//! (through the rack guard), Store (waiting for the save when the rack is unsaved), bank
//! −/+ and set, clear, previous/next rack, `storeRack`, undo of the last store, the lit
//! button's clean recall (a Recovered rack), the Racks pad page. As mock-quick-racks.ts.
//! The mock has no hardware, so every press takes the app's path.

use super::MockSession;
use yahaha::api::*;
use yahaha::launchkey::{self as lk, Page, QuickPanel};

const BANKS: usize = 8;
const SLOTS: usize = 8;

#[derive(Default)]
pub(super) struct MockQuick {
    banks: [[Option<String>; SLOTS]; BANKS],
    bank: u8,
    store: bool,
    waiting: Option<(u8, u8)>,
    /// The last store (`quickRacks.undo`) and the rack id the button held before it.
    undo: Option<(QuickRackUndo, Option<String>)>,
}

/// The rack the hardware keeps unsaved changes in, and the one a store over a rack keeps
/// its old content in (the session's names).
const RECOVERED: &str = "Recovered: ";
const PREVIOUS: &str = "Previous: ";

fn label(bank: u8, slot: u8) -> String {
    format!("{}{}", (b'A' + bank) as char, slot + 1)
}

impl MockQuick {
    fn get(&self, bank: u8, slot: u8) -> Option<&str> {
        self.banks[bank as usize][slot as usize].as_deref()
    }

    /// The bank the Racks page shows, for the live rack `live`.
    fn panel(&self, live: Option<&str>) -> QuickPanel {
        let mut p = QuickPanel { bank: self.bank, store: self.store, ..QuickPanel::default() };
        for s in 0..SLOTS as u8 {
            if let Some(id) = self.get(self.bank, s) {
                p.stored |= 1 << s;
                if Some(id) == live {
                    p.loaded |= 1 << s;
                }
            }
        }
        p
    }

    /// `quickRacks` and, on the Racks page (or any page while Sound is held, `layer`), the
    /// pads, from the racks list `racks`.
    pub(super) fn fill(&self, st: &mut AppState, racks: &[RackEntry], layer: Layer) {
        let live = st.live_rack.id.clone();
        let buttons = (0..SLOTS as u8)
            .map(|s| {
                let id = self.get(self.bank, s);
                let found = id.and_then(|id| racks.iter().find(|r| r.id == id));
                QuickRackButton {
                    rack: id.map(str::to_string),
                    name: found.map(|r| r.name.clone()).unwrap_or_default(),
                    missing: id.is_some() && found.is_none(),
                    loaded: id.is_some() && id == live.as_deref(),
                }
            })
            .collect();
        st.quick_racks = QuickRacksState {
            bank: self.bank,
            buttons,
            store: self.store,
            store_waiting: self.waiting.filter(|w| w.0 == self.bank).map(|w| w.1),
            read_only: false,
            undo: self.undo.as_ref().map(|u| u.0.clone()),
        };
        // Under the fader hold the pads are the fader picker (`MockSession::derive`).
        if layer != Layer::Fader && layer.pads(st.pads.page) == Page::Racks {
            let panel = lk::Panel { page: Page::Racks, layer, ..super::lk_panel(st, self.panel(live.as_deref())) };
            st.pads.pads = lk::racks_looks(&panel)
                .iter()
                .map(|(note, look)| {
                    let action = lk::pad_action(Page::Racks, layer, *note);
                    // Hold Sound: the lit Quick Rack pad and the empty ones capture the live
                    // rack (`storeRack`), as the session's pads do.
                    let capture = match action {
                        Some(lk::Action::QuickRack(slot)) if layer == Layer::Sound && !self.store && self.sound_tap_captures(slot, live.as_deref(), racks) => {
                            Some(slot)
                        }
                        _ => None,
                    };
                    Pad {
                        note: *note,
                        label: look.label.into(),
                        key: look.key.into(),
                        rgb: [look.rgb.0, look.rgb.1, look.rgb.2],
                        level: look.level,
                        anim: look.anim,
                        action: capture.map_or_else(|| action.map(AppCmd::from), |slot| Some(QuickRackCmd::StoreRack { slot }.into())),
                        palette: None,
                    }
                })
                .collect();
        }
    }

    /// Under the Sound hold, whether a tap on button `slot` of the bank on view captures
    /// the live rack `live` (`storeRack`) rather than recalling: the lit button, an empty
    /// one, or one whose rack is gone (the session's `sound_tap_captures`).
    fn sound_tap_captures(&self, slot: u8, live: Option<&str>, racks: &[RackEntry]) -> bool {
        match self.get(self.bank, slot) {
            None => true,
            Some(id) => live == Some(id) || !racks.iter().any(|r| r.id == id),
        }
    }

    /// The first button of the bank on view holding rack `live`.
    fn lit(&self, live: Option<&str>) -> Option<u8> {
        let live = live?;
        (0..SLOTS as u8).find(|&s| self.get(self.bank, s) == Some(live))
    }
}

impl MockSession {
    pub(super) fn quick_rack_cmd(&mut self, c: QuickRackCmd) {
        match c {
            QuickRackCmd::PressQuickRack { slot, discard } => {
                let i = self.quick.bank as usize * SLOTS + slot as usize;
                if slot >= 10 || i >= BANKS * SLOTS {
                    return self.message(format!("no Quick Rack {}", slot as usize + 1), true);
                }
                let (bank, slot) = ((i / SLOTS) as u8, (i % SLOTS) as u8);
                if self.quick.store {
                    return self.store_quick(bank, slot);
                }
                self.load_quick(bank, slot, discard);
            }
            QuickRackCmd::StepQuickRackBank { delta } => {
                self.quick.bank = (self.quick.bank as i16 + delta.signum() as i16).clamp(0, BANKS as i16 - 1) as u8;
            }
            QuickRackCmd::SetQuickRackBank { bank } => {
                if bank as usize >= BANKS {
                    return self.message(format!("no Quick Rack bank {}", bank as usize + 1), true);
                }
                self.quick.bank = bank;
            }
            QuickRackCmd::UndoQuickRackStore => self.undo_quick(),
            QuickRackCmd::ToggleQuickRackStore => {
                self.quick.store = !self.quick.store;
                self.quick.waiting = None;
            }
            // The live rack on the button in one step, saved as it goes (hold Sound + tap
            // a Racks pad); Store armed clears.
            QuickRackCmd::StoreRack { slot } => {
                if slot as usize >= SLOTS {
                    return self.message(format!("no Quick Rack {}", slot as usize + 1), true);
                }
                self.quick.store = false;
                self.quick.waiting = None;
                self.capture_quick(self.quick.bank, slot);
            }
            QuickRackCmd::ClearQuickRack { bank, slot } => {
                if bank as usize >= BANKS || slot as usize >= SLOTS {
                    return self.message(format!("no Quick Rack {bank}:{slot}"), true);
                }
                self.quick.banks[bank as usize][slot as usize] = None;
                self.quick.undo = None;
            }
            QuickRackCmd::StepQuickRack { delta, discard } => {
                let bank = self.quick.bank;
                let stored: Vec<u8> = (0..SLOTS as u8).filter(|&s| self.quick.get(bank, s).is_some()).collect();
                if stored.is_empty() {
                    return self.message(format!("Bank {} has no racks", (b'A' + bank) as char), true);
                }
                let lit = self.quick.lit(self.state.live_rack.id.as_deref());
                let to = match (lit.and_then(|l| stored.iter().position(|&s| s == l)), delta.signum()) {
                    (_, 0) => None,
                    (None, d) if d > 0 => stored.first().copied(),
                    (None, _) => stored.last().copied(),
                    (Some(i), d) if d > 0 => stored.get(i + 1).copied(),
                    (Some(i), _) => i.checked_sub(1).map(|i| stored[i]),
                };
                if let Some(s) = to {
                    self.load_quick(bank, s, discard);
                }
            }
        }
    }

    fn load_quick(&mut self, bank: u8, slot: u8, discard: bool) {
        let Some(id) = self.quick.get(bank, slot).map(str::to_string) else {
            return self.message(format!("Quick Rack {} is empty", label(bank, slot)), true);
        };
        if !self.racks.entries().iter().any(|r| r.id == id) {
            return self.message(format!("Quick Rack {}'s rack is gone", label(bank, slot)), true);
        }
        self.quick.waiting = None;
        // The lit button recalls its rack clean with no prompt, keeping unsaved changes as
        // "Recovered: <name>", as the hardware does.
        let lr = &self.state.live_rack;
        if !discard && lr.modified && lr.id.as_deref() == Some(id.as_str()) {
            let racks = self.racks.entries();
            let base = format!("{RECOVERED}{}", lr.name);
            let name = yahaha::racks::quick::unique_name(&base, |n| racks.iter().any(|r| r.name.eq_ignore_ascii_case(n)));
            if self.save_live(Some(name)).is_none() {
                return self.message("the unsaved rack was not kept", true);
            }
            return self.rack_cmd(RackCmd::LoadRack { id, discard: true });
        }
        self.rack_cmd(RackCmd::LoadRack { id, discard });
    }

    /// Before a store saves over rack `id`: keep its content as "Previous: <name>",
    /// replacing a rack of that name. That rack's id and name, if kept.
    fn keep_previous(&mut self, id: &str) -> Option<(String, String)> {
        let before = self.racks.entries();
        let name = format!("{PREVIOUS}{}", before.iter().find(|r| r.id == id)?.name);
        if let Some(old) = before.iter().find(|r| r.name == name) {
            if self.state.live_rack.id.as_deref() == Some(old.id.as_str()) {
                return None;
            }
            self.cmd(AppCmd::Rack(RackCmd::DeleteRack { id: old.id.clone() }));
        }
        self.rack_cmd(RackCmd::DuplicateRack { id: id.to_string() });
        let copy = self.racks.entries().into_iter().find(|r| !before.iter().any(|b| b.id == r.id))?.id;
        self.rack_cmd(RackCmd::RenameRack { id: copy.clone(), name: name.clone() });
        Some((copy, name))
    }

    /// `undoQuickRackStore`: the button gets back what it held; the "Previous: <name>" rack
    /// is gone (the mock keeps no rack content to put back, so a live rack that is the
    /// restored one counts as changed).
    fn undo_quick(&mut self) {
        let Some((u, rack)) = self.quick.undo.take() else {
            return self.message("Nothing to undo", true);
        };
        self.quick.banks[u.bank as usize][u.slot as usize] = rack.clone();
        if let Some(prev) = &u.previous {
            let kept = self.racks.entries().into_iter().find(|r| r.name == *prev);
            if let Some(kept) = kept.filter(|k| self.state.live_rack.id.as_deref() != Some(k.id.as_str())) {
                self.cmd(AppCmd::Rack(RackCmd::DeleteRack { id: kept.id }));
            }
            if rack.is_some() && self.state.live_rack.id == rack {
                self.state.live_rack.modified = true;
            }
        }
        self.message(format!("Undid the store on Quick Rack {}", label(u.bank, u.slot)), false);
    }

    fn store_quick(&mut self, bank: u8, slot: u8) {
        let lr = &self.state.live_rack;
        match lr.id.clone().filter(|id| !lr.modified && self.racks.entries().iter().any(|r| r.id == *id)) {
            Some(id) => self.put_quick(bank, slot, id, None),
            None => {
                self.quick.waiting = Some((bank, slot));
                self.message(format!("Save the rack first; then it goes on Quick Rack {}", label(bank, slot)), false);
            }
        }
    }

    /// `storeRack` (the session's `capture_quick`): the live rack, saved as it goes, on
    /// button (`bank`, `slot`). The lit button's rack takes the live rack's changes;
    /// elsewhere a saved rack with no changes goes on as it is, and anything else is saved
    /// as a new rack named from the sounds of its on parts ("Rhodes Soft + Strings").
    fn capture_quick(&mut self, bank: u8, slot: u8) {
        let racks = self.racks.entries();
        let modified = self.state.live_rack.modified;
        let own = self.state.live_rack.id.clone().filter(|id| racks.iter().any(|r| r.id == *id));
        let lit = own.is_some() && self.quick.get(bank, slot) == own.as_deref();
        let mut previous = None;
        let id = match own {
            Some(id) if !modified => Some(id),
            // Saved over its own rack: its old content is kept as "Previous: <name>".
            Some(id) if lit => {
                let kept = self.keep_previous(&id);
                let saved = self.save_live(None);
                match kept {
                    Some((copy, _)) if saved.is_none() => self.cmd(AppCmd::Rack(RackCmd::DeleteRack { id: copy })),
                    Some((_, name)) => previous = Some(name),
                    None => {}
                }
                saved
            }
            _ => {
                let sounds: Vec<&str> = self.state.keyboard_parts.iter().filter(|k| k.on).map(|k| k.voice_name.as_str()).collect();
                let base = yahaha::racks::quick::name_from_sounds(sounds).unwrap_or_else(|| "New Rack".into());
                let name = yahaha::racks::quick::unique_name(&base, |n| racks.iter().any(|r| r.name.eq_ignore_ascii_case(n)));
                self.save_live(Some(name))
            }
        };
        match id {
            Some(id) => self.put_quick(bank, slot, id, previous),
            None => self.message("the rack was not saved", true),
        }
    }

    /// Save the live rack (`saveRack`, or `saveRackAs` with a name) with no dialog: edited
    /// presets that become new sounds take their suggested names, and a prompt up in the
    /// app is dismissed. The saved rack's id, if it saved.
    fn save_live(&mut self, save_as: Option<String>) -> Option<String> {
        self.state.live_rack.prompt = None;
        let cmd = |sound_names| match &save_as {
            Some(name) => RackCmd::SaveRackAs { name: name.clone(), sound_names },
            None => RackCmd::SaveRack { sound_names },
        };
        self.rack_cmd(cmd(Default::default()));
        if let Some(RackPrompt::SoundNames { parts, .. }) = self.state.live_rack.prompt.take() {
            let names = parts.into_iter().map(|p| (p.part, if p.suggested.trim().is_empty() { "Sound".to_string() } else { p.suggested })).collect();
            self.rack_cmd(cmd(names));
        }
        let lr = &self.state.live_rack;
        lr.id.clone().filter(|_| !lr.modified && lr.prompt.is_none())
    }

    /// Rack `id` on button (`bank`, `slot`); `previous` names the "Previous: <name>" rack
    /// kept when the store saved over the button's own rack. A store that changes the
    /// button or saves over a rack is the one `undoQuickRackStore` takes back.
    fn put_quick(&mut self, bank: u8, slot: u8, id: String, previous: Option<String>) {
        let old = self.quick.banks[bank as usize][slot as usize].clone();
        if old.as_deref() != Some(id.as_str()) || previous.is_some() {
            let racks = self.racks.entries();
            let held = old.and_then(|o| racks.into_iter().find(|r| r.id == o));
            let (rack, name) = held.map_or((None, String::new()), |r| (Some(r.id), r.name));
            self.quick.undo = Some((QuickRackUndo { bank, slot, name, previous }, rack));
        }
        self.quick.banks[bank as usize][slot as usize] = Some(id);
        self.quick.store = false;
        self.quick.waiting = None;
        let name = self.state.live_rack.name.clone();
        self.message(format!("Stored {name} on Quick Rack {}", label(bank, slot)), false);
    }

    /// After a rack command, as the session does: a waiting button takes the saved rack;
    /// deleting a rack empties its buttons; a load or dismissing the prompt lets a waiting
    /// Store go.
    pub(super) fn quick_after_rack_cmd(&mut self, c: &RackCmd) {
        match c {
            RackCmd::SaveRack { .. } | RackCmd::SaveRackAs { .. } => {
                let lr = &self.state.live_rack;
                if let (Some((bank, slot)), Some(id), false) = (self.quick.waiting, lr.id.clone(), lr.modified || lr.prompt.is_some()) {
                    self.put_quick(bank, slot, id, None);
                }
            }
            RackCmd::DeleteRack { id } if !self.racks.entries().iter().any(|r| r.id == *id) => {
                for b in self.quick.banks.iter_mut().flatten() {
                    if b.as_deref() == Some(id.as_str()) {
                        *b = None;
                    }
                }
            }
            RackCmd::LoadRack { .. } | RackCmd::NewRack { .. } | RackCmd::RevertRack | RackCmd::DismissRackPrompt => self.quick.waiting = None,
            _ => {}
        }
    }
}
