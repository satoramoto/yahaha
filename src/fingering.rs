//! Chord fingering types (RM p.9, OM p.46): a dispatch layer around the Fingered
//! recognizer in `theory`. Runs on the CoreMIDI input thread, so everything here works
//! on the held-key array in place and never allocates.
//!
//! Where the manuals leave a rule open, this module picks one (see each function):
//!
//! - **Single Finger**: the highest key is the root. Any other black key below it makes
//!   the chord minor, any white key makes it a 7th, both make it m7. Octave doublings of
//!   the root are ignored.
//! - **Multi Finger**: three or more pitch classes that Fingered recognizes (not Cancel)
//!   are read as Fingered. Otherwise a Single Finger shape (one or two keys, at most one
//!   of each colour, within an octave below the root) is read as Single Finger, except a
//!   perfect fifth above the lower key, which stays Fingered 1+5.
//! - **AI Fingered**: three or more pitch classes are read as Fingered. Fewer than three
//!   keep the previous chord if they all belong to it; otherwise two notes are inferred
//!   from their interval (`infer_dyad`) and one note falls back to Fingered.
//! - **Full Keyboard**: the whole keyboard is read with On Bass rules (the lowest key is
//!   the bass). It needs three pitch classes; if they are not a chord, the highest keys
//!   (the melody) are dropped one at a time until they are. A chord over a bass note
//!   that is not one of its tones counts only when no such reading exists. Fewer than
//!   three pitch classes leave the chord unchanged, so a melody alone never changes it.
//!   Sync Stop is unavailable (the engine refuses it).
//! - **AI Full Keyboard**: Full Keyboard plus AI inference for two notes (single notes
//!   are melody and never change the chord). 9th, 11th and 13th chords are reduced to
//!   the chord without the tension.
//! - Chord Cancel only exists in Fingered, Fingered On Bass and AI Fingered.
//! - Fingered, Multi Finger and AI Fingered always put the bass on the root.

use crate::theory::{chord_tones, Chord, Recognizer, CANCEL};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Fingering {
    SingleFinger,
    MultiFinger,
    Fingered,
    FingeredOnBass,
    AiFingered,
    FullKeyboard,
    AiFullKeyboard,
}

impl Fingering {
    /// Display order, as in the Genos Split & Fingering screen.
    pub const ALL: [Fingering; 7] = [
        Fingering::SingleFinger,
        Fingering::Fingered,
        Fingering::FingeredOnBass,
        Fingering::MultiFinger,
        Fingering::AiFingered,
        Fingering::FullKeyboard,
        Fingering::AiFullKeyboard,
    ];

    pub fn name(self) -> &'static str {
        match self {
            Fingering::SingleFinger => "Single Finger",
            Fingering::MultiFinger => "Multi Finger",
            Fingering::Fingered => "Fingered",
            Fingering::FingeredOnBass => "Fingered On Bass",
            Fingering::AiFingered => "AI Fingered",
            Fingering::FullKeyboard => "Full Keyboard",
            Fingering::AiFullKeyboard => "AI Full Keyboard",
        }
    }

    /// Parse a CLI name: "single", "multi", "fingered", "on-bass", "ai", "full", "ai-full"
    /// (case, spaces, dashes and underscores are ignored; full names work too).
    pub fn parse(s: &str) -> Option<Fingering> {
        let k: String = s.chars().filter(|c| c.is_ascii_alphanumeric()).collect::<String>().to_ascii_lowercase();
        Some(match k.as_str() {
            "single" | "singlefinger" => Fingering::SingleFinger,
            "multi" | "multifinger" => Fingering::MultiFinger,
            "fingered" => Fingering::Fingered,
            "onbass" | "fingeredonbass" => Fingering::FingeredOnBass,
            "ai" | "aifingered" => Fingering::AiFingered,
            "full" | "fullkeyboard" => Fingering::FullKeyboard,
            "aifull" | "aifullkeyboard" => Fingering::AiFullKeyboard,
            _ => return None,
        })
    }

    pub fn to_u8(self) -> u8 {
        Fingering::ALL.iter().position(|&f| f == self).unwrap() as u8
    }

    pub fn from_u8(v: u8) -> Fingering {
        Fingering::ALL[v as usize % Fingering::ALL.len()]
    }

    /// Next type in display order (the TUI cycles with one key).
    pub fn next(self) -> Fingering {
        Fingering::from_u8(self.to_u8() + 1)
    }

    /// Chords are detected over the whole keyboard, ignoring the split.
    pub fn full_keyboard(self) -> bool {
        matches!(self, Fingering::FullKeyboard | Fingering::AiFullKeyboard)
    }

    /// Sync Stop cannot be turned on with Full or AI Full Keyboard (OM p.66).
    pub fn allows_sync_stop(self) -> bool {
        !self.full_keyboard()
    }

    /// Chord Cancel is available only in Fingered, Fingered On Bass and AI Fingered (OM p.46).
    pub fn allows_cancel(self) -> bool {
        matches!(self, Fingering::Fingered | Fingering::FingeredOnBass | Fingering::AiFingered)
    }
}

/// Held keys summarised: pitch-class mask, lowest and highest key, distinct pitch classes.
#[derive(Clone, Copy)]
struct Scan {
    mask: u16,
    low: u8,
    high: u8,
    n: u32,
}

/// Summarise the held keys below `limit` (exclusive).
fn scan(held: &[bool; 128], limit: u8) -> Option<Scan> {
    let mut mask = 0u16;
    let mut low = None;
    let mut high = 0u8;
    for k in 0..limit {
        if held[k as usize] {
            mask |= 1 << (k % 12);
            low.get_or_insert(k);
            high = k;
        }
    }
    Some(Scan { mask, low: low?, high, n: mask.count_ones() })
}

fn is_black(key: u8) -> bool {
    matches!(key % 12, 1 | 3 | 6 | 8 | 10)
}

fn tones_mask(c: Chord) -> u16 {
    let m = chord_tones(c.ty).iter().fold(0u16, |m, &t| m | 1 << ((c.root + t) % 12));
    m | c.bass.map_or(0, |b| 1 << (b % 12))
}

fn root_bass(c: Chord) -> Chord {
    Chord { bass: None, ..c }
}

/// The one call into the Fingered (On Bass) recognizer.
#[inline]
fn fingered(rec: &Recognizer, s: Scan) -> Option<Chord> {
    rec.recognize(s.mask, s.low % 12)
}

/// Detect the chord for the held keys. `held` is the chord section, or the whole keyboard
/// for the Full Keyboard types. `prev` is the chord in force. Returns None to leave the
/// chord unchanged (a Some equal to `prev` also changes nothing).
pub fn detect(rec: &Recognizer, mode: Fingering, held: &[bool; 128], prev: Option<Chord>) -> Option<Chord> {
    let s = scan(held, 128)?;
    let c = match mode {
        Fingering::FingeredOnBass => fingered(rec, s),
        Fingering::Fingered => fingered(rec, s).map(root_bass),
        Fingering::SingleFinger => Some(single(held, s)),
        Fingering::MultiFinger => multi(rec, held, s),
        Fingering::AiFingered => ai(rec, s, prev, true).map(root_bass),
        Fingering::FullKeyboard => full(rec, held, s),
        Fingering::AiFullKeyboard => full(rec, held, s).or_else(|| ai(rec, s, prev, false)).map(no_tensions),
    };
    c.filter(|c| c.ty != CANCEL || mode.allows_cancel())
}

/// Single Finger: root = highest key; black key below = m, white = 7, both = m7.
fn single(held: &[bool; 128], s: Scan) -> Chord {
    let root = s.high % 12;
    let (mut black, mut white) = (false, false);
    for k in s.low..s.high {
        if held[k as usize] && k % 12 != root {
            if is_black(k) {
                black = true;
            } else {
                white = true;
            }
        }
    }
    let ty = match (black, white) {
        (false, false) => 0,
        (true, false) => 8,
        (false, true) => 19,
        (true, true) => 10,
    };
    Chord::new(root, ty)
}

/// A playable Single Finger shape: one or two other keys, within an octave below the
/// root and of different colours.
fn single_shape(held: &[bool; 128], s: Scan) -> bool {
    let root = s.high % 12;
    let (mut black, mut white) = (0, 0);
    for k in s.low..s.high {
        if held[k as usize] && k % 12 != root {
            if s.high - k >= 12 {
                return false;
            }
            if is_black(k) {
                black += 1;
            } else {
                white += 1;
            }
        }
    }
    black <= 1 && white <= 1
}

fn multi(rec: &Recognizer, held: &[bool; 128], s: Scan) -> Option<Chord> {
    if let Some(c) = fingered(rec, s).filter(|c| s.n >= 3 && c.ty != CANCEL) {
        return Some(root_bass(c));
    }
    let fifth_up = s.n == 2 && s.mask & (1 << ((s.low + 7) % 12)) != 0;
    if s.n >= 2 && !fifth_up && single_shape(held, s) {
        return Some(single(held, s));
    }
    if s.n <= 2 {
        return fingered(rec, s).filter(|c| c.ty != CANCEL).map(root_bass);
    }
    None
}

/// AI inference for fewer than three pitch classes (`single_note`: whether a lone note
/// may set a chord, which Full Keyboard play does not allow).
fn ai(rec: &Recognizer, s: Scan, prev: Option<Chord>, single_note: bool) -> Option<Chord> {
    if s.n >= 3 {
        return fingered(rec, s);
    }
    if let Some(p) = prev.filter(|&p| p.ty != CANCEL && s.mask & !tones_mask(p) == 0) {
        return Some(p);
    }
    match s.n {
        1 if single_note => fingered(rec, s),
        2 => infer_dyad(rec, s, prev),
        _ => None,
    }
}

/// Two pitch classes not in the previous chord. `a` is the lower key's pitch class.
fn infer_dyad(rec: &Recognizer, s: Scan, prev: Option<Chord>) -> Option<Chord> {
    let a = s.low % 12;
    let b = (0..12u8).find(|&p| p != a && s.mask & (1 << p) != 0)?;
    let up = |n: u8| (a + n) % 12;
    Some(match (b + 12 - a) % 12 {
        3 => Chord::new(a, 8),       // minor 3rd: m
        4 => Chord::new(a, 0),       // major 3rd: major
        8 => Chord::new(b, 0),       // minor 6th = major 1st inversion (E-C = C)
        9 => Chord::new(b, 8),       // major 6th = minor 1st inversion (C-A = Am)
        10 => Chord::new(a, 19),     // minor 7th: 7
        11 => Chord::new(a, 2),      // major 7th: maj7
        6 => Chord::new(up(8), 19),  // tritone: the lower note is the 3rd of a 7th (B-F = G7)
        5 | 7 => return fingered(rec, s).map(root_bass), // 1+5 and its inversion, as Fingered
        _ => return prev,            // a 2nd: a passing note, keep the chord
    })
}

/// Full Keyboard: On Bass reading of the whole keyboard, dropping melody notes from the
/// top until the rest is a chord. A chord over a bass note foreign to it is only taken
/// if no melody-dropped reading is a plain chord or inversion. Needs three pitch
/// classes; no Cancel.
fn full(rec: &Recognizer, held: &[bool; 128], s: Scan) -> Option<Chord> {
    let mut foreign_bass = None;
    let mut s = s;
    while s.n >= 3 {
        if let Some(c) = fingered(rec, s).filter(|c| c.ty != CANCEL) {
            match c.bass {
                Some(b) if tones_mask(root_bass(c)) & (1 << b) == 0 => {
                    foreign_bass.get_or_insert(c);
                }
                _ => return Some(c),
            }
        }
        s = scan(held, s.high)?;
    }
    foreign_bass
}

/// AI Full Keyboard cannot play 9th, 11th or 13th chords: drop the tension.
fn no_tensions(c: Chord) -> Chord {
    let ty = match c.ty {
        4 => 0,
        6 => 1,
        3 | 5 => 2,
        12 => 8,
        13 | 14 => 10,
        16 => 15,
        22..=27 => 19,
        t => t,
    };
    Chord { ty, ..c }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn held(keys: &[u8]) -> [bool; 128] {
        let mut h = [false; 128];
        for &k in keys {
            h[k as usize] = true;
        }
        h
    }

    fn name(rec: &Recognizer, mode: Fingering, keys: &[u8], prev: Option<Chord>) -> String {
        detect(rec, mode, &held(keys), prev).map_or("-".into(), |c| c.name())
    }

    #[test]
    fn parse_and_cycle() {
        assert_eq!(Fingering::parse("on-bass"), Some(Fingering::FingeredOnBass));
        assert_eq!(Fingering::parse("AI Full Keyboard"), Some(Fingering::AiFullKeyboard));
        assert_eq!(Fingering::parse("ai_fingered"), Some(Fingering::AiFingered));
        assert_eq!(Fingering::parse("nope"), None);
        let mut f = Fingering::SingleFinger;
        for _ in 0..Fingering::ALL.len() {
            assert_eq!(Fingering::from_u8(f.to_u8()), f);
            f = f.next();
        }
        assert_eq!(f, Fingering::SingleFinger);
        assert!(!Fingering::FullKeyboard.allows_sync_stop() && Fingering::AiFingered.allows_sync_stop());
    }

    #[test]
    fn single_finger() {
        let r = Recognizer::new();
        let sf = Fingering::SingleFinger;
        assert_eq!(name(&r, sf, &[48], None), "C");
        assert_eq!(name(&r, sf, &[46, 48], None), "Cm"); // + black key below
        assert_eq!(name(&r, sf, &[45, 48], None), "C7"); // + white key below
        assert_eq!(name(&r, sf, &[45, 46, 48], None), "Cm7"); // + both
        assert_eq!(name(&r, sf, &[53, 55], None), "G7");
        assert_eq!(name(&r, sf, &[36, 48], None), "C"); // root doubled an octave down
    }

    #[test]
    fn fingered_vs_on_bass() {
        let r = Recognizer::new();
        let c_e = [40, 48, 52, 55];
        assert_eq!(name(&r, Fingering::FingeredOnBass, &c_e, None), "C/E");
        assert_eq!(name(&r, Fingering::Fingered, &c_e, None), "C");
        assert_eq!(detect(&r, Fingering::Fingered, &held(&[48, 49, 50]), None).unwrap().ty, CANCEL);
    }

    #[test]
    fn multi_finger() {
        let r = Recognizer::new();
        let m = Fingering::MultiFinger;
        assert_eq!(name(&r, m, &[48, 51, 55], None), "Cm"); // Fingered wins over G + Eb + C
        assert_eq!(name(&r, m, &[43, 47, 50, 53], None), "G7");
        assert_eq!(name(&r, m, &[46, 48], None), "Cm");
        assert_eq!(name(&r, m, &[45, 48], None), "C7");
        assert_eq!(name(&r, m, &[45, 46, 48], None), "Cm7");
        assert_eq!(name(&r, m, &[48], None), "C");
        assert_eq!(name(&r, m, &[48, 55], None), "C5"); // 1+5 stays Fingered
        // No Cancel in Multi: C-Db-D is the Single Finger m7 shape on D.
        assert_eq!(name(&r, m, &[48, 49, 50], None), "Dm7");
    }

    #[test]
    fn ai_fingered() {
        let r = Recognizer::new();
        let ai = Fingering::AiFingered;
        let am7 = Some(Chord::new(9, 10));
        assert_eq!(name(&r, ai, &[48, 52], am7), "Am7"); // C-E are in Am7: keep it
        assert_eq!(name(&r, ai, &[50], am7), "D"); // lone note outside it: Fingered
        assert_eq!(name(&r, ai, &[50, 53], am7), "Dm");
        assert_eq!(name(&r, ai, &[50, 54], None), "D");
        assert_eq!(name(&r, ai, &[52, 60], None), "C");
        assert_eq!(name(&r, ai, &[48, 57], None), "Am");
        assert_eq!(name(&r, ai, &[48, 58], None), "C7");
        assert_eq!(name(&r, ai, &[47, 53], None), "G7"); // B-F tritone
        assert_eq!(name(&r, ai, &[48, 50], am7), "Am7"); // a 2nd: passing note
        assert_eq!(name(&r, ai, &[40, 48, 52, 55], None), "C"); // 3+ notes, bass = root
        assert_eq!(detect(&r, ai, &held(&[48, 49, 50]), am7).unwrap().ty, CANCEL);
    }

    #[test]
    fn full_keyboard() {
        let r = Recognizer::new();
        let f = Fingering::FullKeyboard;
        assert_eq!(name(&r, f, &[40, 72, 76, 79], None), "C/E"); // LH bass + RH chord
        assert_eq!(name(&r, f, &[48, 52, 55, 73], None), "C"); // LH chord + RH Db melody
        assert_eq!(name(&r, f, &[38, 72, 76, 79], None), "Cadd9/D"); // bass that is a chord tone
        assert_eq!(name(&r, f, &[48, 52, 55, 78], None), "C"); // F# melody
        assert_eq!(name(&r, f, &[72], Some(Chord::new(0, 0))), "-"); // melody alone
        assert_eq!(name(&r, f, &[48, 49, 50], None), "-"); // no Cancel
    }

    #[test]
    fn ai_full_keyboard() {
        let r = Recognizer::new();
        let f = Fingering::AiFullKeyboard;
        assert_eq!(name(&r, f, &[48, 52, 55, 58, 62], None), "C7"); // C9 not available
        assert_eq!(name(&r, f, &[48, 52, 55, 62], None), "C"); // Cadd9 -> C
        assert_eq!(name(&r, f, &[74], Some(Chord::new(0, 0))), "-"); // lone melody note
        assert_eq!(name(&r, f, &[50, 53], Some(Chord::new(0, 0))), "Dm");
    }

    /// Full Keyboard types switch Sync Stop off and keep it off.
    #[test]
    fn full_keyboard_disables_sync_stop() {
        use crate::engine::{Button, Engine, Prepared};
        let path = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("corpus/MOX_v2/FunkyFinger.S930.STY");
        if !path.exists() {
            return;
        }
        let mut e = Engine::new(Box::new(Prepared::new(&crate::sff::Style::load(&path).unwrap())));
        let mut rec = crate::sim::Recorder::default();
        e.button(Button::SyncStop, 0, &mut rec);
        assert!(e.snapshot(0).sync_stop);
        e.allow_sync_stop(Fingering::AiFullKeyboard.allows_sync_stop());
        assert!(!e.snapshot(0).sync_stop);
        e.button(Button::SyncStop, 0, &mut rec);
        assert!(!e.snapshot(0).sync_stop);
        e.allow_sync_stop(Fingering::AiFingered.allows_sync_stop());
        e.button(Button::SyncStop, 0, &mut rec);
        assert!(e.snapshot(0).sync_stop);
    }
}
