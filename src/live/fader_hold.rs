//! The fader hold: while the master fader's button is held (without Shift), the pads are
//! the fader picker from any page (`Layer::Fader`, `launchkey/pages/faders.rs`): PANEL and
//! STYLE pick the fader page, VOL · PAN · REV · CHO · DLY the fader layer, at once. Release
//! brings back the page on view. A tap (released with no pad pressed, a dark pad counting
//! as pressed) still switches the
//! fader page, as the button did before; Shift + the button still steps the layer and holds
//! nothing.
//!
//! Runs on the MIDI input thread: no allocation, locks or panics.

use crate::launchkey::{self, Action, Layer, Page};

/// The master fader's button went down without Shift: the layer while it is held. Like
/// Sound, it takes over from any other hold.
pub fn press(now: Layer) -> Layer {
    let _ = now;
    Layer::Fader
}

/// The button went up: the fader layer ends; any other layer (Sound or a swap started
/// during the hold) stays.
pub fn release(now: Layer) -> Layer {
    if now == Layer::Fader { Layer::None } else { now }
}

/// Whether the release is a tap that switches the fader page: no pad (a dark one included)
/// was pressed during the hold, and the picker was still up (another hold that took over ends it).
pub fn tap(picked: bool, now: Layer) -> bool {
    !picked && now == Layer::Fader
}

/// Pad `note` pressed under the hold: the picker's pad.
pub fn pad(note: u8) -> Option<Action> {
    launchkey::pad_action(Page::Sections, Layer::Fader, note)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::parts::{FaderLayer, FaderPage};

    #[test]
    fn the_hold_sets_and_clears_the_fader_layer() {
        for now in [Layer::None, Layer::Sound, Layer::Fader, Layer::Swap { part: 2 }] {
            assert_eq!(press(now), Layer::Fader);
        }
        assert_eq!(release(Layer::Fader), Layer::None);
        assert_eq!(release(Layer::None), Layer::None);
        assert_eq!(release(Layer::Sound), Layer::Sound, "a Sound hold started during it stays");
        assert!(tap(false, Layer::Fader));
        assert!(!tap(true, Layer::Fader), "a pad was picked: no page switch");
        assert!(!tap(false, Layer::Sound), "Sound took over: no page switch");
    }

    #[test]
    fn the_pads_pick_the_page_and_layer() {
        assert_eq!(pad(96), Some(Action::SetFaderPage(FaderPage::Panel)));
        assert_eq!(pad(97), Some(Action::SetFaderPage(FaderPage::Style)));
        assert_eq!(pad(112), Some(Action::SetFaderLayer(FaderLayer::Volume)));
        assert_eq!(pad(116), Some(Action::SetFaderLayer(FaderLayer::Delay)));
        assert_eq!(pad(98), None);
        assert_eq!(pad(119), None);
    }
}
