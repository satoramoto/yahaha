//! Offline driver: runs the engine with simulated time and records what it sends.

use crate::engine::{Button, Engine, Prepared, Sink, Transpose};
use crate::theory::Chord;

#[derive(Default)]
pub struct Recorder {
    pub now: u64,
    pub out: Vec<(u64, Vec<u8>)>,
}

impl Sink for Recorder {
    fn send(&mut self, msg: &[u8]) {
        self.out.push((self.now, msg.to_vec()));
    }
}

#[allow(dead_code)]
pub enum Step {
    Chord(Chord),
    Button(Button),
    Transpose(Transpose),
}

/// Run a script of (time_ns, step) against the engine until `end_ns`.
pub fn run(style: Box<Prepared>, script: &[(u64, Step)], end_ns: u64) -> (Engine, Recorder) {
    let mut e = Engine::new(style);
    let mut rec = Recorder::default();
    let mut i = 0;
    let mut now = 0u64;
    loop {
        let next_script = script.get(i).map(|s| s.0);
        let next_engine = e.next_deadline();
        let t = [next_script, next_engine, Some(end_ns)].into_iter().flatten().min().unwrap();
        now = now.max(t);
        rec.now = now;
        // Script steps at this instant happen before the engine plays what is due.
        while let Some((ts, step)) = script.get(i) {
            if *ts > now {
                break;
            }
            match step {
                Step::Chord(c) => e.set_chord(*c, now, &mut rec),
                Step::Button(b) => e.button(*b, now, &mut rec),
                Step::Transpose(t) => e.set_transpose(*t, now, &mut rec),
            }
            i += 1;
        }
        e.process(now, &mut rec);
        if now >= end_ns {
            break;
        }
    }
    (e, rec)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::sff::Style;

    fn corpus() -> Vec<std::path::PathBuf> {
        let dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("corpus");
        let mut v = Vec::new();
        let mut stack = vec![dir];
        while let Some(d) = stack.pop() {
            for e in std::fs::read_dir(&d).into_iter().flatten().flatten() {
                let p = e.path();
                if p.is_dir() {
                    stack.push(p);
                } else if p.extension().map_or(false, |x| {
                    matches!(x.to_ascii_lowercase().to_str(), Some("sty" | "prs" | "sst" | "bcs" | "pcs" | "fps"))
                }) {
                    v.push(p);
                }
            }
        }
        v.sort();
        v
    }

    /// Faders scale the style's own part volume instead of replacing it.
    #[test]
    fn fader_scales_style_volume() {
        let path = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("corpus/MOX_v2/FunkyFinger.S930.STY");
        if !path.exists() {
            return;
        }
        let prep = Box::new(Prepared::new(&Style::load(&path).unwrap()));
        let mut e = Engine::new(prep);
        let mut rec = Recorder::default();
        e.send_init(&mut rec);
        let style_bass = rec.out.iter().rev().find(|(_, m)| m[0] == 0xBA && m[1] == 7).map(|(_, m)| m[2]).unwrap_or(100);
        rec.out.clear();
        e.set_gain(2, 64, &mut rec); // part 3 = Bass (ch 11)
        assert_eq!(rec.out.last().unwrap().1, vec![0xBA, 7, (style_bass as u32 * 64 / 127) as u8]);
        rec.out.clear();
        e.send_init(&mut rec); // a later style volume message is still scaled
        let v = rec.out.iter().rev().find(|(_, m)| m[0] == 0xBA && m[1] == 7).unwrap().1[2];
        assert_eq!(v, (style_bass as u32 * 64 / 127) as u8);
    }

    /// Stop Accompaniment: chords sound on bass + pad while stopped, and clear on start.
    #[test]
    fn stop_accompaniment() {
        let path = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("corpus/MOX_v2/FunkyFinger.S930.STY");
        if !path.exists() {
            return;
        }
        let mut e = Engine::new(Box::new(Prepared::new(&Style::load(&path).unwrap())));
        let mut rec = Recorder::default();
        e.button(Button::SyncStart, 0, &mut rec); // disarm sync start
        e.button(Button::StopAcmp, 0, &mut rec);
        e.set_chord(Chord::new(9, 8), 1, &mut rec); // Am
        let ons: Vec<(u8, u8)> = rec.out.iter().filter(|(_, m)| m[0] & 0xF0 == 0x90).map(|(_, m)| (m[0] & 0xF, m[1] % 12)).collect();
        assert!(ons.contains(&(10, 9)), "bass A: {ons:?}");
        for pc in [9, 0, 4] {
            assert!(ons.contains(&(13, pc)), "pad {pc}: {ons:?}");
        }
        assert!(!e.is_running());
        rec.out.clear();
        e.set_chord(Chord::new(5, 0), 2, &mut rec); // F: old notes off, new on
        assert!(rec.out.iter().any(|(_, m)| m[0] == 0x8A && m[1] % 12 == 9));
        assert!(rec.out.iter().any(|(_, m)| m[0] == 0x9A && m[1] % 12 == 5));
        rec.out.clear();
        e.button(Button::StartStop, 3, &mut rec);
        assert!(rec.out.iter().any(|(_, m)| m[0] == 0x8A && m[1] % 12 == 5), "released on start");
    }

    /// Every style: play through intro, mains, fills, break, chord changes and ending.
    /// Afterwards the engine must be stopped with no sounding notes, and every note-on
    /// must have a matching note-off.
    #[test]
    fn corpus_full_performance_no_stuck_notes() {
        let files = corpus();
        if files.is_empty() {
            eprintln!("no corpus; skipping");
            return;
        }
        let chords = [Chord::new(0, 0), Chord::new(9, 10), Chord::new(5, 2), Chord::new(7, 19),
                      Chord::new(2, 8), Chord { root: 0, ty: 0, bass: Some(4) }, Chord::new(10, 22), Chord::new(6, 11)];
        for f in files {
            let style = Style::load(&f).unwrap();
            let prep = Box::new(Prepared::new(&style));
            let bar = (60e9 / prep.bpm * (prep.tpb as f64 / prep.ppq as f64)) as u64;
            let mut script = vec![(0, Step::Button(Button::Intro(0))), (1_000, Step::Chord(chords[0]))];
            let mut t = bar / 3;
            for (i, b) in [Button::Main(1), Button::Main(1), Button::Main(2), Button::Break, Button::Main(3),
                           Button::Main(0), Button::AutoFill, Button::Main(2), Button::Intro(1)].iter().enumerate() {
                script.push((t, Step::Button(*b)));
                script.push((t + bar / 7, Step::Chord(chords[(i + 1) % chords.len()])));
                t += bar + bar / 5;
            }
            // Transpose changes while notes sound (Keyboard moves the chord, Master the output).
            script.push((bar * 2 + bar / 2, Step::Transpose(Transpose::new(3, 0))));
            script.push((bar * 4 + bar / 3, Step::Transpose(Transpose::new(3, -5))));
            script.push((bar * 6 + bar / 5, Step::Transpose(Transpose::new(-12, 12))));
            script.push((t, Step::Button(Button::Ending(0))));
            script.sort_by_key(|s| s.0);
            let (e, rec) = run(prep, &script, t + bar * 12);
            let name = f.file_name().unwrap().to_string_lossy().to_string();
            assert!(!e.is_running(), "{name}: still running after ending");
            let mut on = std::collections::HashMap::<(u8, u8), i32>::new();
            let mut notes = 0;
            for (_, m) in &rec.out {
                match m[0] & 0xF0 {
                    0x90 => { *on.entry((m[0] & 0xF, m[1])).or_default() += 1; notes += 1; }
                    0x80 => { *on.entry((m[0] & 0xF, m[1])).or_default() -= 1; }
                    _ => {}
                }
            }
            assert!(notes > 20, "{name}: only {notes} notes");
            for ((ch, key), n) in on {
                assert_eq!(n, 0, "{name}: ch{} key {key} unbalanced by {n}", ch + 1);
            }
            // No part may be left bent after it stops.
            for ch in 8..16u8 {
                if let Some((_, m)) = rec.out.iter().rev().find(|(_, m)| m[0] == 0xE0 | ch) {
                    assert_eq!((m[1], m[2]), (0, 0x40), "{name}: ch{} left bent", ch + 1);
                }
            }
        }
    }
}

#[cfg(test)]
mod transpose {
    use super::*;
    use crate::engine::{shift_key, Snapshot};
    use crate::sff::Style;

    fn funky() -> Option<Box<Prepared>> {
        let path = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("corpus/MOX_v2/FunkyFinger.S930.STY");
        path.exists().then(|| Box::new(Prepared::new(&Style::load(&path).unwrap())))
    }

    fn bar_ns(p: &Prepared) -> u64 {
        (60e9 / p.bpm * (p.tpb as f64 / p.ppq as f64)) as u64
    }

    fn snap(e: &Engine) -> Snapshot {
        e.snapshot(0)
    }

    /// Keyboard transpose +2 with C fingered plays exactly what fingering D plays.
    #[test]
    fn keyboard_transpose_moves_chord_root() {
        let Some(p) = funky() else { return };
        let end = bar_ns(&p) * 4;
        let c7_over_e = Chord { root: 0, ty: 19, bass: Some(4) };
        let (e, a) = run(p, &[(0, Step::Transpose(Transpose::new(2, 0))), (0, Step::Chord(c7_over_e)), (end / 2, Step::Chord(Chord::new(9, 8)))], end);
        let s = snap(&e);
        assert_eq!(s.chord, Some(Chord::new(11, 8)), "Am + 2 = Bm");
        assert_eq!(s.played, Some(Chord::new(9, 8)));
        let (_, b) = run(funky().unwrap(), &[(0, Step::Chord(Chord { root: 2, ty: 19, bass: Some(6) })), (end / 2, Step::Chord(Chord::new(11, 8)))], end);
        assert!(a.out.len() > 50);
        assert_eq!(a.out, b.out);
    }

    /// Changing Keyboard transpose with a chord held is the same as playing the moved chord then.
    #[test]
    fn keyboard_transpose_change_moves_held_chord() {
        let Some(p) = funky() else { return };
        let bar = bar_ns(&p);
        let (_, a) = run(p, &[(0, Step::Chord(Chord::new(0, 0))), (bar + bar / 3, Step::Transpose(Transpose::new(5, 0)))], bar * 3);
        let (_, b) = run(funky().unwrap(), &[(0, Step::Chord(Chord::new(0, 0))), (bar + bar / 3, Step::Chord(Chord::new(5, 0)))], bar * 3);
        assert!(a.out.len() > 50);
        assert_eq!(a.out, b.out);
    }

    /// Master transpose shifts every pitched style note and leaves drum parts alone. The chord
    /// the style follows (and shows) is unchanged.
    #[test]
    fn master_transpose_shifts_output_not_drums() {
        let Some(p) = funky() else { return };
        let kit = p.kit;
        let end = bar_ns(&p) * 4;
        let script = |m: i8| vec![(0, Step::Transpose(Transpose::new(0, m))), (0, Step::Chord(Chord::new(9, 8))), (end / 2, Step::Chord(Chord::new(5, 0)))];
        let (e, a) = run(p, &script(-3), end);
        assert_eq!(snap(&e).chord, Some(Chord::new(5, 0)));
        let (_, b) = run(funky().unwrap(), &script(0), end);
        assert_eq!(a.out.len(), b.out.len());
        let (mut drums, mut pitched) = (0, 0);
        for ((ta, ma), (tb, mb)) in a.out.iter().zip(&b.out) {
            assert_eq!(ta, tb);
            let ch = mb[0] & 0x0F;
            if matches!(mb[0] & 0xF0, 0x80 | 0x90) && !kit[ch as usize] {
                assert_eq!((ma[0], ma[1], ma[2]), (mb[0], shift_key(mb[1], -3), mb[2]));
                pitched += 1;
            } else {
                assert_eq!(ma, mb);
                drums += matches!(mb[0] & 0xF0, 0x90) as u32;
            }
        }
        assert!(drums > 10 && pitched > 10, "drums {drums} pitched {pitched}");
    }

    /// A Master change mid-note: sounding notes keep their pitch and are released at it.
    #[test]
    fn master_change_mid_note_releases_old_pitch() {
        let Some(p) = funky() else { return };
        let bar = bar_ns(&p);
        let script = [(0, Step::Chord(Chord::new(0, 0))), (bar / 3, Step::Transpose(Transpose::new(0, 7))), (bar * 2 + bar / 5, Step::Transpose(Transpose::new(-4, -12)))];
        let (mut e, mut rec) = run(p, &script, bar * 3);
        e.stop(&mut rec);
        let mut on = std::collections::HashMap::<(u8, u8), i32>::new();
        for (_, m) in &rec.out {
            match m[0] & 0xF0 {
                0x90 => *on.entry((m[0] & 0xF, m[1])).or_default() += 1,
                0x80 => *on.entry((m[0] & 0xF, m[1])).or_default() -= 1,
                _ => {}
            }
        }
        assert!(on.values().all(|&n| n == 0), "{on:?}");
    }

    /// Stop Accompaniment follows a Keyboard transpose change with the band stopped.
    #[test]
    fn stop_accompaniment_follows_keyboard_transpose() {
        let Some(p) = funky() else { return };
        let mut e = Engine::new(p);
        let mut rec = Recorder::default();
        e.button(Button::SyncStart, 0, &mut rec);
        e.button(Button::StopAcmp, 0, &mut rec);
        e.set_chord(Chord::new(0, 0), 1, &mut rec);
        rec.out.clear();
        e.set_transpose(Transpose::new(-1, 2), 2, &mut rec);
        // Chord is now B; the bass sounds B + 2 = C#.
        assert!(rec.out.iter().any(|(_, m)| m[0] == 0x9A && m[1] % 12 == 1), "{:?}", rec.out);
        assert_eq!(snap(&e).chord, Some(Chord::new(11, 0)));
    }
}

#[cfg(test)]
mod style_switch {
    use super::*;
    use crate::sff::Style;

    /// Switching style mid-bend must re-centre the bend (TenorToTheMAX bends Chord 2 constantly).
    #[test]
    fn style_change_recentres_bends() {
        let dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("corpus/MOX_v2");
        let (a, b) = (dir.join("TenorToTheMAX.S930.STY"), dir.join("FunkyFinger.S930.STY"));
        if !a.exists() || !b.exists() {
            return;
        }
        let pa = Box::new(Prepared::new(&Style::load(&a).unwrap()));
        let pb = Box::new(Prepared::new(&Style::load(&b).unwrap()));
        let bar = (60e9 / pa.bpm * (pa.tpb as f64 / pa.ppq as f64)) as u64;
        // Stop right after the first bend away from centre.
        let (_, full) = run(pa, &[(0, Step::Chord(Chord::new(0, 0)))], bar * 8);
        let (t_bend, status) = full
            .out
            .iter()
            .find(|(_, m)| m[0] & 0xF0 == 0xE0 && (m[1], m[2]) != (0, 0x40))
            .map(|(t, m)| (*t, m[0]))
            .expect("expected the style to bend a part");
        let pa = Box::new(Prepared::new(&Style::load(&a).unwrap()));
        let (mut e, mut rec) = run(pa, &[(0, Step::Chord(Chord::new(0, 0)))], t_bend);
        rec.out.clear();
        rec.now = t_bend + 1;
        let _old = e.load(pb, t_bend + 1, &mut rec);
        let last = rec.out.iter().rev().find(|(_, m)| m[0] == status).map(|(_, m)| (m[1], m[2]));
        assert_eq!(last, Some((0, 0x40)));
    }
}
