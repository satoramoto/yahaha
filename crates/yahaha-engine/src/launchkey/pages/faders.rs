//! The fader picker: what the pads show while the master fader's button is held
//! (`Layer::Fader`), from any pad page, as Sound shows the Racks page. The top row picks
//! the fader page, as the Genos Mixer's Panel and Style tabs: PANEL (the rack's parts) and
//! STYLE (the band). The bottom row picks the fader layer, as the mixer's VOL · PAN · REV ·
//! CHO · DLY buttons. Each pad is lit in the colour its choice gives the fader buttons
//! (`layer_colour`; Style green), bright for the current choice, dim for the rest; the
//! other pads are dark. Release gives the page on view back.

use crate::launchkey::{layer_colour, look_led, palette_colour, Action, Anim, Led, Level, Look, Panel, DIM_GREEN, GREEN, OFF};
use crate::parts::{FaderLayer, FaderPage};

/// The page pads (top row, from the left) and the layer pads (bottom row, from the left).
const PAGE_PADS: [(u8, FaderPage, &str); 2] = [(96, FaderPage::Panel, "PANEL"), (97, FaderPage::Style, "STYLE")];
const LAYER_PAD: u8 = 112;

pub fn pad_action(note: u8) -> Option<Action> {
    if let Some(&(_, page, _)) = PAGE_PADS.iter().find(|(n, ..)| *n == note) {
        return Some(Action::SetFaderPage(page));
    }
    let i = note.checked_sub(LAYER_PAD)? as usize;
    FaderLayer::ALL.get(i).map(|&l| Action::SetFaderLayer(l))
}

/// A pad's palette colours (bright, dim) and whether it is the current choice; None for a
/// dark pad.
fn pad(p: &Panel, note: u8) -> Option<(&'static str, (u8, u8), bool)> {
    match pad_action(note)? {
        // PANEL in the current layer's colour, as the master fader's button shows it.
        Action::SetFaderPage(FaderPage::Panel) => Some(("PANEL", layer_colour(p.fader_layer), p.fader_page == FaderPage::Panel)),
        Action::SetFaderPage(FaderPage::Style) => Some(("STYLE", (GREEN, DIM_GREEN), p.fader_page == FaderPage::Style)),
        Action::SetFaderLayer(l) => Some((l.short(), layer_colour(l), p.fader_layer == l)),
        _ => None,
    }
}

const NOTES: [u8; 16] = [96, 97, 98, 99, 100, 101, 102, 103, 112, 113, 114, 115, 116, 117, 118, 119];

/// The picker's pads.
pub fn looks(p: &Panel) -> [(u8, Look); 16] {
    NOTES.map(|note| {
        let look = match pad(p, note) {
            Some((label, (bright, _), on)) => {
                Look { label, key: "", rgb: palette_colour(bright).0, level: if on { Level::Bright } else { Level::Dim }, anim: Anim::Solid }
            }
            None => Look { label: "", key: "", rgb: (0, 0, 0), level: Level::Off, anim: Anim::Solid },
        };
        (note, look)
    })
}

/// The picker in palette mode: each pad in its own colour.
pub fn leds(p: &Panel) -> [(u8, Led); 16] {
    looks(p).map(|(note, look)| {
        let (bright, dim) = pad(p, note).map_or((OFF, OFF), |(_, c, _)| c);
        (note, look_led(&look, bright, dim))
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::launchkey::{BLUE, CYAN, DIM_BLUE, DIM_CYAN, DIM_PINK, DIM_WHITE, DIM_YELLOW, PINK, WHITE, YELLOW};

    fn panel(fader_page: FaderPage, fader_layer: FaderLayer) -> Panel {
        Panel { fader_page, fader_layer, ..Panel::default() }
    }

    fn look(p: &Panel, note: u8) -> Look {
        looks(p).into_iter().find(|(n, _)| *n == note).expect("a pad").1
    }

    fn led(p: &Panel, note: u8) -> Led {
        leds(p).into_iter().find(|(n, _)| *n == note).expect("a pad").1
    }

    /// PANEL and STYLE on the top row's first two pads, VOL PAN REV CHO DLY on the bottom
    /// row's first five; every other note does nothing.
    #[test]
    fn the_pads_pick_page_and_layer() {
        assert_eq!(pad_action(96), Some(Action::SetFaderPage(FaderPage::Panel)));
        assert_eq!(pad_action(97), Some(Action::SetFaderPage(FaderPage::Style)));
        for (i, l) in FaderLayer::ALL.into_iter().enumerate() {
            assert_eq!(pad_action(112 + i as u8), Some(Action::SetFaderLayer(l)));
        }
        for n in (0..=127u8).filter(|n| ![96, 97, 112, 113, 114, 115, 116].contains(n)) {
            assert_eq!(pad_action(n), None, "note {n}");
        }
    }

    /// The current page and layer bright, the other choices dim, each in its own colour;
    /// PANEL takes the layer's colour, as the master fader's button does; the rest dark.
    #[test]
    fn current_choice_bright_the_rest_dim() {
        let colours = [(BLUE, DIM_BLUE), (YELLOW, DIM_YELLOW), (CYAN, DIM_CYAN), (PINK, DIM_PINK), (WHITE, DIM_WHITE)];
        for page in [FaderPage::Panel, FaderPage::Style] {
            for (cur, &(cb, cd)) in FaderLayer::ALL.into_iter().zip(&colours) {
                let p = panel(page, cur);
                assert_eq!(looks(&p).map(|(n, _)| n), NOTES);
                assert_eq!(leds(&p).map(|(n, _)| n), NOTES);
                let on = page == FaderPage::Panel;
                assert_eq!(led(&p, 96), Led::Solid(if on { cb } else { cd }), "{page:?} {cur:?}");
                assert_eq!(led(&p, 97), Led::Solid(if on { DIM_GREEN } else { GREEN }), "{page:?} {cur:?}");
                assert_eq!((look(&p, 96).label, look(&p, 97).label), ("PANEL", "STYLE"));
                for (i, (l, &(b, d))) in FaderLayer::ALL.into_iter().zip(&colours).enumerate() {
                    let note = 112 + i as u8;
                    let want = if l == cur { (Level::Bright, b) } else { (Level::Dim, d) };
                    assert_eq!((look(&p, note).level, led(&p, note)), (want.0, Led::Solid(want.1)), "{page:?} {cur:?} {l:?}");
                    assert_eq!(look(&p, note).label, l.short());
                    assert_eq!(look(&p, note).rgb, palette_colour(b).0);
                }
                for note in [98, 99, 100, 101, 102, 103, 117, 118, 119] {
                    assert_eq!((look(&p, note).level, look(&p, note).label, led(&p, note)), (Level::Off, "", Led::Solid(OFF)), "note {note}");
                }
            }
        }
    }
}
