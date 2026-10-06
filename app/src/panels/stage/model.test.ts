// The Stage's data: the pure functions from AppState to the Stage's region props
// (docs/specs/push/Stage.md and kit.md).

import { describe, expect, it } from 'vitest'
import { emptyState } from '../../lib/api/constants'
import { MockSession } from '../../lib/api/mock'
import type { AppState, ControlId, KnobState, LibraryEntry, LibraryList, Meters, Pad, PadPage, PartPlugin, SurfaceFader } from '../../lib/api/types'
import { FINGERINGS } from '../../lib/api/types'
import {
  appBar,
  chordNotes,
  display,
  faders,
  holdPeak,
  keys,
  knobs,
  meterFraction,
  padFace,
  padHue,
  pads,
  sectionBar,
  sectionName,
  sectionRow,
  splitChord,
  status,
  statusHint,
  HELP_IDLE,
  valueText,
  whenText,
} from './model'
import { TIPS } from '../../help/tooltips'

describe('statusHint (tooltips in the status line)', () => {
  const err = (seq: number) => ({ seq, text: 'refused', error: true })

  it('is the shown control\'s entry: title, body, labelled keys and the first Launchkey place', () => {
    const t = TIPS['transport.sync_start']
    const h = statusHint({ key: 'transport.sync_start', help: false, message: null, since: 0 })!
    expect(h.title).toBe(t.title)
    expect(h.body).toBe(t.body)
    expect(h.keys).toBe('Y')
    const places = t.launchkey!.split('; ')
    expect(h.launchkey).toBe(places[0] + (places.length > 1 ? ` (+${places.length - 1} more)` : ''))
    expect(statusHint({ key: 'app.theme', help: false, message: null, since: 0 })!.launchkey).toBeNull()
  })

  it('nothing hovered: no hint, or how help mode works in help mode', () => {
    expect(statusHint({ key: null, help: false, message: null, since: 0 })).toBeNull()
    expect(statusHint({ key: null, help: true, message: null, since: 0 })).toBe(HELP_IDLE)
  })

  it('an error newer than the hover wins; an older one or a notice stays under the hint', () => {
    expect(statusHint({ key: 'transport.acmp', help: false, message: err(5), since: 4 })).toBeNull()
    expect(statusHint({ key: 'transport.acmp', help: false, message: err(5), since: 5 })).not.toBeNull()
    expect(statusHint({ key: 'transport.acmp', help: false, message: { seq: 9, text: 'ok', error: false }, since: 0 })).not.toBeNull()
  })

  it('the status line\'s own button shows no hint, so it never covers the message it explains', () => {
    expect(statusHint({ key: 'display.status', help: false, message: err(1), since: 1 })).toBeNull()
  })

  it('status() carries the hint with the message', () => {
    const s = new MockSession({ manual: true }).state
    s.message = err(3)
    expect(status(s, HELP_IDLE)).toEqual({ hint: HELP_IDLE, text: 'refused', error: true, seq: 3 })
    expect(status(s).hint).toBeNull()
  })
})

const NBSP = ' '
const EMPTY_LIBRARY: LibraryList = { revision: 0, entries: [], voices: [], harmonyTypes: [], arpPatterns: [] }

function state(edit?: (s: AppState) => void): AppState {
  const s = emptyState()
  edit?.(s)
  return s
}

function demo(): AppState {
  const session = new MockSession({ demo: true, manual: true })
  session.advance(16)
  return session.state
}

const pad = (p: Partial<Pad> = {}): Pad => ({ note: 0, label: 'X', key: '', rgb: [0, 0, 0], level: 'dim', anim: 'solid', action: { type: 'tapTempo' }, palette: null, ...p })
const fader = (p: Partial<SurfaceFader>): SurfaceFader => ({ label: '', value: 100, waiting: false, position: null, set: { type: 'setStyleVolume', volume: 0 }, ...p })
const plugin = (p: Partial<PartPlugin>): PartPlugin => ({
  id: 'x', name: 'Sampler Deluxe', manufacturer: 'Fake', status: 'playing', stage: null, error: null, outOfProcess: true,
  inProcessFallback: false, cpu: 0, overruns: 0, recentOverruns: 0, editor: false, missing: false, ...p,
})
const knob = (p: Partial<KnobState>): KnobState => ({ function: 'dynamics', name: 'Dynamics Control', short: 'DynCtrl', value: '64', level: 64, ...p })
const entry = (p: Partial<LibraryEntry>): LibraryEntry => ({
  id: 1, name: 'Style', folder: '', path: '', status: 'ok', error: null, tempo: null, timeSignature: null, sections: '', format: null, ...p,
})
const meters = (p: Partial<Meters>): Meters => ({ atMs: 0, channels: [], master: [0, 0], masterRms: [0, 0], clips: 0, cpu: { total: 0.25, peak: 0.3, bufferUs: 1333 }, ...p })
const control = (s: AppState, id: ControlId) => s.surface.controls.find((c) => c.id === id)!

function running(s: AppState, t: Partial<AppState['transport']> = {}) {
  Object.assign(s.transport, { running: true, section: 'Main A', bar: 3, sectionBars: 4, ...t })
}

// ── Pure formatting ──────────────────────────────────────────────────────────────────────

describe('sectionName', () => {
  it('names sections the Genos way, a numeral tied by a no-break space', () => {
    expect(sectionName('Intro A')).toBe(`Intro${NBSP}I`)
    expect(sectionName('Intro D')).toBe(`Intro${NBSP}IV`)
    expect(sectionName('Ending C')).toBe(`Ending${NBSP}III`)
    expect(sectionName('Main B')).toBe(`Main${NBSP}B`)
    expect(sectionName('Fill In BA')).toBe('Break')
    expect(sectionName('Fill In AB')).toBe('Fill')
    expect(sectionName('Fill In DD')).toBe('Fill')
    expect(sectionName('Something')).toBe('Something')
  })
})

describe('splitChord', () => {
  it('splits the root and its quality from the rest (D30)', () => {
    const split = (n: string | null) => {
      const r = splitChord(n)
      return `${r.chord}|${r.extension}`
    }
    expect(split('Am7')).toBe('Am|7')
    expect(split('Cmaj7')).toBe('C|maj7')
    expect(split('C#m7b5')).toBe('C#m|7b5')
    expect(split('EbmMaj7')).toBe('Ebm|Maj7')
    expect(split('Gdim7')).toBe('Gdim|7')
    expect(split('Csus4')).toBe('C|sus4')
    expect(split('Am7/G')).toBe('Am|7/G')
    expect(split('F')).toBe('F|')
    expect(split('N.C.')).toBe('N.C.|')
    expect(split(null)).toBe('|')
  })
})

describe('chordNotes', () => {
  const notes = (name: string, tones: number[], transposeKeyboard = 0) =>
    chordNotes(
      state((s) => {
        s.chord.name = name
        s.chord.transposeKeyboard = transposeKeyboard
        s.keyboard.chordTones = tones
      }),
    ).map((n) => `${n.note}:${n.interval}`)

  it('names the tones with their intervals, root first', () => {
    expect(notes('Am7', [9, 0, 4, 7])).toEqual(['A:R', 'C:m3', 'E:5', 'G:m7'])
    expect(notes('Cmaj7', [0, 4, 7, 11])).toEqual(['C:R', 'E:3', 'G:5', 'B:M7'])
  })

  it('moves the fingered tones by transposeKeyboard, kept in 0–11', () => {
    // Fingered C (0 4 7), two up: D.
    expect(notes('D', [0, 4, 7], 2)).toEqual(['D:R', 'F#:3', 'A:5'])
    // Fingered C, one down: B.
    expect(notes('B', [0, 4, 7], -1)).toEqual(['B:R', 'D#:3', 'F#:5'])
  })

  it('spells with flats for an F or a flat root', () => {
    expect(notes('Fm', [5, 8, 0])).toEqual(['F:R', 'Ab:m3', 'C:5'])
    expect(notes('Bb7', [10, 2, 5, 8])).toEqual(['Bb:R', 'D:3', 'F:5', 'Ab:m7'])
    expect(notes('C#m', [1, 4, 8])).toEqual(['C#:R', 'E:m3', 'G#:5'])
  })

  it('reads the minor third as #9 when both thirds are there', () => {
    expect(notes('C7(#9)', [0, 4, 7, 10, 3])).toEqual(['C:R', 'E:3', 'G:5', 'A#:m7', 'D#:#9'])
  })

  it('at most six, and none without a chord', () => {
    expect(notes('C13', [0, 4, 7, 10, 2, 5, 9])).toHaveLength(6)
    expect(chordNotes(state((s) => (s.keyboard.chordTones = [0, 4, 7])))).toEqual([])
    expect(chordNotes(state((s) => (s.chord.name = 'C')))).toEqual([])
  })
})

describe('sectionBar and whenText (kit › Count row)', () => {
  it('a looping Main counts the bar within its pattern', () => {
    const t = state().transport
    expect(sectionBar({ ...t, bar: 3, sectionBars: 4 })).toBe(3)
    expect(sectionBar({ ...t, bar: 4, sectionBars: 4 })).toBe(4)
    expect(sectionBar({ ...t, bar: 5, sectionBars: 4 })).toBe(1)
    expect(sectionBar({ ...t, bar: 11, sectionBars: 4 })).toBe(3)
    expect(sectionBar({ ...t, bar: 7, sectionBars: null })).toBe(7)
    expect(sectionBar({ ...t, bar: 0, sectionBars: 4 })).toBe(1)
  })

  it('stopped: sync start, else nothing', () => {
    expect(whenText(state())).toBe('')
    expect(whenText(state((s) => (s.transport.syncStart = true)))).toBe('sync start')
  })

  it('a fill queued or playing, and the Break', () => {
    expect(whenText(state((s) => running(s, { queued: 'Fill In AB', landing: 'Main B' })))).toBe('fill after bar 3')
    expect(whenText(state((s) => running(s, { section: 'Fill In AA', queued: null, landing: 'Main A' })))).toBe('fill after bar 3')
    expect(whenText(state((s) => running(s, { queued: 'Fill In BA', landing: 'Main A' })))).toBe('break after bar 3')
    // The bar wraps on a looping Main.
    expect(whenText(state((s) => running(s, { bar: 6, queued: 'Fill In AB', landing: 'Main B' })))).toBe('fill after bar 2')
  })

  it('an Intro or Ending at the end of the section, a Main at once, else after the bar', () => {
    const queued = (q: string, edit?: (s: AppState) => void) =>
      whenText(
        state((s) => {
          running(s, { queued: q, sectionBars: 8 })
          edit?.(s)
        }),
      )
    expect(queued('Ending A')).toBe('after bar 3')
    expect(queued('Ending A', (s) => (s.styleSettings.introEndingTiming = 'endOfSection'))).toBe('after bar 8')
    expect(queued('Intro B', (s) => (s.styleSettings.introEndingTiming = 'endOfSection'))).toBe('after bar 8')
    expect(queued('Main C')).toBe('after bar 3')
    expect(queued('Main C', (s) => (s.styleSettings.mainTiming = 'immediate'))).toBe('next beat')
    expect(queued('Ending A', (s) => (s.styleSettings.mainTiming = 'immediate'))).toBe('after bar 3')
    expect(whenText(state((s) => running(s)))).toBe('')
  })
})

describe('valueText, meterFraction, holdPeak', () => {
  it('pan C / L / R, sends with their layer, volume bare', () => {
    expect(valueText('volume', 90)).toBe('90')
    expect(valueText('pan', 64)).toBe('C')
    expect(valueText('pan', 44)).toBe('L20')
    expect(valueText('pan', 84)).toBe('R20')
    expect(valueText('reverb', 40)).toBe('Rev 40')
    expect(valueText('chorus', 10)).toBe('Cho 10')
    expect(valueText('delay', 0)).toBe('Dly 0')
  })

  it('maps −60…0 dBFS onto the travel', () => {
    expect(meterFraction(0)).toBe(0)
    expect(meterFraction(-1)).toBe(0)
    expect(meterFraction(NaN)).toBe(0)
    expect(meterFraction(0.001)).toBeCloseTo(0, 9)
    expect(meterFraction(0.0001)).toBe(0)
    expect(meterFraction(1)).toBe(1)
    expect(meterFraction(2)).toBe(1)
    expect(meterFraction(0.1)).toBeCloseTo(2 / 3, 9)
    expect(meterFraction(0.0724)).toBeCloseTo((20 * Math.log10(0.0724) + 60) / 60, 9)
  })

  it('holds 1.5 s, then falls 20 dB a second', () => {
    let h = holdPeak(undefined, 0.5, 0)
    expect(h).toEqual({ peak: 0.5, sinceMs: 0 })
    h = holdPeak(h, 0.1, 1000)
    expect(h.peak).toBe(0.5)
    h = holdPeak(h, 0.1, 1500)
    expect(h.peak).toBe(0.5)
    const later = holdPeak(h, 0.01, 2500)
    expect(later.peak).toBeCloseTo(0.05, 9)
    expect(holdPeak(h, 0.2, 2500)).toEqual({ peak: 0.2, sinceMs: 2500 })
    expect(holdPeak(h, 0.7, 100)).toEqual({ peak: 0.7, sinceMs: 100 })
  })
})

describe('padFace (develop\'s HwPad: dark, queued, armed, on, available)', () => {
  it('off dark, flash next, pulse armed, bright playing, dim idle; the action doesn\'t change the light', () => {
    expect(padFace(pad({ level: 'off' }))).toBe('dark')
    expect(padFace(pad({ level: 'bright', action: null }))).toBe('playing')
    expect(padFace(pad({ level: 'dim', action: null }))).toBe('idle')
    expect(padFace(pad({ level: 'dim' }))).toBe('idle')
    expect(padFace(pad({ level: 'bright', anim: 'flash' }))).toBe('next')
    // A pulsing pad (Sync Start on, an armed Intro, the Main a fill lands on) is armed, as on the old pads.
    expect(padFace(pad({ level: 'bright', anim: 'pulse' }))).toBe('armed')
    expect(padFace(pad({ level: 'bright' }))).toBe('playing')
  })
})

describe('padHue: the engine\'s pad colours onto the kit\'s hues', () => {
  it('every colour src/launchkey.rs lights a pad in maps to its own hue', () => {
    // The colours of `looks()` (mock-pads.ts is its port) and their hues.
    const cases: [Pad['rgb'], string][] = [
      [[127, 95, 0], 'intro'], // Intro
      [[0, 127, 16], 'main'], // Main
      [[127, 0, 0], 'ending'], // Ending, a loaded Quick Rack, a Multi Pad playing, Stop
      [[90, 0, 127], 'brk'], // Break
      [[127, 45, 0], 'r3'], // Sync Start
      [[0, 45, 127], 'r1'], // Auto Fill
      [[100, 100, 100], 'util'], // Tap
      [[0, 110, 110], 'l'], // Sync Stop
      [[0, 127, 0], 'main'], // Start (running)
      [[127, 60, 0], 'r3'], // the Racks page; a Multi Pad waiting
      [[0, 100, 127], 'l'], // the Chord page
      [[127, 127, 0], 'intro'], // the Multi Pads page
      [[127, 0, 70], 'r2'], // the Setup page
      [[0, 40, 127], 'r1'], // a stored Quick Rack, a Multi Pad with data
    ]
    for (const [rgb, hue] of cases) expect(padHue(rgb), rgb.join(',')).toBe(hue)
    expect(padHue([0, 0, 0])).toBeNull()
  })
})

// ── Regions ──────────────────────────────────────────────────────────────────────────────

describe('faders on Panel', () => {
  const input = (s: AppState, m: Meters | null = null, holds: number[] = []) => faders({ state: s, meters: m, holds })

  it('the demo: four parts, Style, Multi Pad, two parked, Master', () => {
    const f = input(demo())
    expect(f.page).toBe('panel')
    expect(f.strips.map((x) => `${x.id}:${x.kind}`)).toEqual([
      'right1:part', 'right2:part', 'right3:off', 'left:off', 'style:group', 'multiPad:group', 'fader7:parked', 'fader8:parked', 'master:master',
    ])
    expect(f.strips[1].value).toBe('72')
    expect(f.strips[1].level).toBe(72)
  })

  it('a part switched off reads kind off', () => {
    const f = input(
      state((s) => {
        s.surface.faders[0] = fader({ label: 'RIGHT 1', set: { type: 'setPartVolume', part: 0, volume: 0 } })
        s.keyboardParts[0].sounding = false
      }),
    )
    expect(f.strips[0]).toMatchObject({ id: 'right1', tag: 'Right 1', kind: 'off', hue: 'r1' })
  })

  it('soft takeover: the hardware position shows as away, and in the name', () => {
    const f = input(
      state((s) => {
        s.keyboardParts[1].sounding = true
        s.keyboardParts[1].volume = 90
        s.keyboardParts[1].waiting = true
        s.keyboardParts[2].volume = 90
        s.surface.faders[1] = fader({ label: 'RIGHT 2', value: 90, waiting: true, position: 40, set: { type: 'setPartVolume', part: 1, volume: 0 } })
        s.surface.faders[2] = fader({ label: 'RIGHT 3', value: 90, waiting: false, position: 40, set: { type: 'setPartVolume', part: 2, volume: 0 } })
      }),
    )
    expect(f.strips[1].away).toBe(40)
    expect(f.strips[1].faderName).toBe('Right 2 90, hardware fader away')
    expect(f.strips[2].away).toBeUndefined()
  })

  it('reads each level from the part, never from the Launchkey fader (a stale or remapped surface)', () => {
    const f = input(
      state((s) => {
        s.keyboardParts[0].volume = 101
        s.keyboardParts[0].sounding = true
        s.mixer.styleVolume = 77
        s.mixer.multiPadVolume = 66
        s.mixer.master = 99
        // The surface says something else (or nothing): the strip doesn't care.
        s.surface.faders[0] = fader({ label: 'RIGHT 1', value: 12 })
        s.surface.faders[4] = fader({ label: '', value: null, set: null })
        s.surface.faders[5] = fader({ label: 'M.PAD', value: 3 })
        s.surface.faders[8] = fader({ label: 'MASTER', value: 4 })
      }),
    )
    expect(f.strips.map((x) => `${x.id}:${x.value}`)).toEqual(expect.arrayContaining(['right1:101', 'style:77', 'multiPad:66', 'master:99']))
    expect(f.strips[0].level).toBe(101)
  })

  it('a rack that maps a Launchkey fader elsewhere (or to nothing) leaves the strip the part\'s, with its level (D63)', () => {
    const m = meters({ channels: [{ channel: 1, peak: 1, rms: 1, cpu: 0, cpuPeak: 0 }] })
    const f = input(
      state((s) => {
        s.keyboardParts[0].sounding = true
        s.keyboardParts[0].volume = 88
        s.keyboardParts[1].sounding = true
        s.keyboardParts[1].volume = 55
        s.surface.faders[0] = fader({ label: 'PANR2', value: 64, waiting: true, position: 3, set: { type: 'moveRackFader', fader: 0, volume: 0 } })
        s.surface.faders[1] = fader({ label: '', value: null, set: null })
      }),
      m,
      [1],
    )
    expect(f.strips[0]).toMatchObject({ id: 'right1', tag: 'Right 1', kind: 'part', value: '88', level: 88, meter: 1, away: undefined })
    expect(f.strips[0].faderName).toBe('Right 1 88, Launchkey fader 1 moves PANR2')
    expect(f.strips[1]).toMatchObject({ id: 'right2', tag: 'Right 2', kind: 'part', value: '55', level: 55 })
  })

  it('after a Quick Rack recall the strips show the recalled levels (mock session round trip)', () => {
    const session = new MockSession({ demo: true, manual: true })
    session.send({ type: 'setPartVolume', part: 0, volume: 40 })
    session.send({ type: 'storeRack', slot: 0 })
    session.send({ type: 'setPartVolume', part: 0, volume: 120 })
    expect(input(session.state).strips[0].value).toBe('120')
    session.send({ type: 'pressQuickRack', slot: 0, discard: true })
    expect(session.state.keyboardParts[0].volume).toBe(40)
    expect(input(session.state).strips[0]).toMatchObject({ value: '40', level: 40 })
  })

  it('a part strip on Volume reads its channel\'s meter; on another layer the part\'s pan or send, no meter', () => {
    const m = meters({ channels: [{ channel: 3, peak: 1, rms: 0.1, cpu: 0, cpuPeak: 0 }] })
    const s = state((st) => {
      st.keyboardParts[1].sounding = true // Right 2 is channel 3
      st.keyboardParts[1].reverb = 40
      st.keyboardParts[1].chorus = 30
      st.keyboardParts[1].variation = 20
      st.keyboardParts[1].pan = 44
      st.surface.faders[1] = fader({ label: 'RIGHT 2', set: { type: 'setPartVolume', part: 1, volume: 0 } })
    })
    const vol = input(s, m, [0, 1])
    expect(vol.strips[1].meter).toBe(1)
    expect(vol.strips[1].meter2).toBeCloseTo(2 / 3, 9)
    expect(vol.strips[1].peak).toBe(1)
    s.mixer.faderLayer = 'reverb'
    expect(input(s, m, [0, 1]).strips[1]).toMatchObject({ value: 'Rev 40', level: 40, meter: 0, tip: 'mixer.part.reverb' })
    s.mixer.faderLayer = 'chorus'
    expect(input(s, m).strips[1]).toMatchObject({ value: 'Cho 30', level: 30 })
    s.mixer.faderLayer = 'delay'
    expect(input(s, m).strips[1]).toMatchObject({ value: 'Dly 20', level: 20 })
    s.mixer.faderLayer = 'pan'
    expect(input(s, m).strips[1]).toMatchObject({ value: 'L20', level: 44 })
  })

  it('a send layer waits on its own bit (`mixer.sendWaiting`)', () => {
    const s = state((st) => {
      st.mixer.faderLayer = 'reverb'
      st.mixer.sendWaiting = 1 << 2
      st.surface.faders[2] = fader({ label: 'RIGHT 3', position: 5 })
      st.surface.faders[1] = fader({ label: 'RIGHT 2', position: 5 })
    })
    const f = input(s)
    expect(f.strips[2].away).toBe(5)
    expect(f.strips[1].away).toBeUndefined()
  })

  it('no synth: Master parked', () => {
    const f = input(
      state((s) => {
        s.io.synth = null
        s.mixer.master = null
        s.surface.faders[8] = fader({ label: '', value: null, set: null })
      }),
    )
    expect(f.strips[8]).toMatchObject({ id: 'master', tag: 'Master', kind: 'parked' })
  })
})

describe('faders on the Style page', () => {
  function styleState() {
    return state((s) => {
      s.mixer.faderPage = 'style'
      ;['RHY1', 'RHY2', 'BASS', 'CHD1', 'CHD2', 'PAD', 'PHR1', 'PHR2'].forEach((label, i) => {
        s.mixer.styleParts[i].volume = 80 + i
        s.mixer.styleParts[i].reverb = 10 + i
        // The surface's value is stale: the strip reads the Style part.
        s.surface.faders[i] = fader({ label, value: 1, set: { type: 'setStylePartVolume', part: i, volume: 0 } })
      })
      s.surface.faders[8] = fader({ label: 'MASTER', set: { type: 'setMasterVolume', volume: 0 } })
      const c1 = control(s, 'faderButton1')
      c1.label = 'RHY1'
      c1.level = 'bright'
      c1.action = { type: 'toggleStylePart', part: 0 }
      const c2 = control(s, 'faderButton2')
      c2.label = 'RHY2'
      c2.level = 'dim'
      c2.action = { type: 'toggleStylePart', part: 1 }
      control(s, 'faderButton6').label = 'SOUND'
    })
  }

  it('strips read the labels the state sends; Master as on Panel', () => {
    const f = faders({ state: styleState(), meters: null, holds: [] })
    expect(f.page).toBe('style')
    expect(f.strips.slice(0, 8).map((x) => `${x.id}:${x.tag}:${x.value}`)).toEqual([
      'style1:RHY1:80', 'style2:RHY2:81', 'style3:BASS:82', 'style4:CHD1:83', 'style5:CHD2:84', 'style6:PAD:85', 'style7:PHR1:86', 'style8:PHR2:87',
    ])
    expect(f.strips[8]).toMatchObject({ id: 'master', kind: 'master' })
  })

  it('a send layer shows each Style part\'s send; Pan parks them (a Style part has no pan)', () => {
    const s = styleState()
    s.mixer.faderLayer = 'reverb'
    expect(faders({ state: s, meters: null, holds: [] }).strips.slice(0, 3).map((x) => x.value)).toEqual(['Rev 10', 'Rev 11', 'Rev 12'])
    s.mixer.faderLayer = 'pan'
    expect(faders({ state: s, meters: null, holds: [] }).strips[0]).toMatchObject({ kind: 'parked', tag: 'RHY1' })
  })

  it('lamps come from the fader buttons; Sound stays', () => {
    const s = styleState()
    s.surface.layer = { type: 'sound' }
    const f = faders({ state: s, meters: null, holds: [] })
    expect(f.partLamps.map((l) => `${l.id}:${l.label}:${l.on}`)).toEqual(['fb1:RHY1:true', 'fb2:RHY2:false', 'fb3:—:false', 'fb4:—:false'])
    expect(f.partLamps[0].tip).toBe('mixer.style.mute')
    expect(f.partLamps[2].tip).toBe('launchkey.fader_unused')
    expect(f.functionLamps.map((l) => l.id)).toEqual(['fb5', 'sound', 'fb7', 'fb8'])
    expect(f.functionLamps[1]).toMatchObject({ label: 'Sound', on: true, long: true })
  })
})

describe('lamps on Panel', () => {
  it('a part reads On / Off, lit from sounding; its swap reads "Swap"', () => {
    const s = state((st) => {
      st.keyboardParts[0].on = true
      st.keyboardParts[0].sounding = true
      st.keyboardParts[3].on = false
      st.keyboardParts[3].sounding = true // Left playing the bass under Manual Bass
      st.surface.layer = { type: 'swap', part: 1 }
    })
    const f = faders({ state: s, meters: null, holds: [] })
    expect(f.partLamps.map((l) => `${l.id}:${l.label}:${l.on}`)).toEqual(['right1:On:true', 'right2:Swap:false', 'right3:Off:false', 'left:Off:true'])
    expect(f.partLamps[1].tip).toBe('part.swap')
    expect(f.partLamps[0].tip).toBe('part.right1.on')
  })

  it('Sound is lit while the layer is sound; Harm/Arp, L Hold and Looper from the state', () => {
    const s = state((st) => {
      st.surface.layer = { type: 'sound' }
      st.harmonyArp.on = true
      st.looper.mode = 'recording'
    })
    const f = faders({ state: s, meters: null, holds: [] })
    expect(f.functionLamps.map((l) => `${l.id}:${l.on}`)).toEqual(['harmArp:true', 'sound:true', 'leftHold:false', 'looper:true'])
    expect(f.functionLamps[3].hue).toBe('t')
    expect(faders({ state: state(), meters: null, holds: [] }).functionLamps[1].on).toBe(false)
  })
})

describe('knobs', () => {
  it('No Assign, a trailing %, tempo without " BPM", the fraction', () => {
    const k = knobs({
      state: state((s) => {
        s.transport.tempo = 104
        s.knobs = {
          page: 'pan', pageName: 'Pan', pageNumber: 3, pageCount: 6,
          knobs: [
            knob({ value: '127', level: 127 }),
            knob({ function: 'none', name: 'No Assign', short: '---', value: '', level: null }),
            knob({ function: 'swing', name: 'Swing', short: 'Swing', value: '30%', level: 38 }),
            knob({ function: 'tempo', name: 'Tempo', short: 'Tempo', value: '104 BPM', level: null }),
            knob({ function: 'harmonyVolume', name: 'Harmony Volume', short: 'HrmVol', value: '51', level: 51 }),
          ],
        }
      }),
    })
    expect(k.pages).toEqual(['Style', 'Rack', 'Pan', 'Reverb', 'Chorus', 'Delay'])
    expect(k.page).toBe(2)
    expect(k.knobs[0]).toEqual({ label: 'Dynamics', code: 'DynCtrl', value: '127', unit: undefined, fraction: 1 })
    expect(k.knobs[1]).toMatchObject({ label: '---', unused: true, fraction: 0 })
    expect(k.knobs[2]).toMatchObject({ label: 'Swing', value: '30', unit: '%' })
    expect(k.knobs[3]).toMatchObject({ label: 'Tempo', value: '104' })
    expect(k.knobs[3].fraction).toBeCloseTo((104 - 40) / 240, 9)
    expect(k.knobs[4].fraction).toBeCloseTo(51 / 127, 9)
  })
})

describe('knob page tabs', () => {
  it('swap mode: one tab named as the state names it', () => {
    const k = knobs({
      state: state((s) => {
        s.surface.layer = { type: 'swap', part: 2 }
        s.knobs.pageName = 'Swap R3'
      }),
    })
    expect(k.pages).toEqual([])
    expect(k.pageLabel).toBe('Swap R3')
  })
})

describe('section row transport', () => {
  it('running, Sync Start and fading from the transport', () => {
    expect(sectionRow({ state: state(), help: false })).toMatchObject({ running: false, syncStart: false, fading: false })
    const r = sectionRow({
      state: state((s) => {
        running(s)
        s.transport.syncStart = true
        s.transport.fade = 'fadingOut'
      }),
      help: true,
    })
    expect(r).toMatchObject({ running: true, syncStart: true, fading: true, help: true })
  })
})

describe('pads', () => {
  it('Sections: fixed captions, faces from the lamps, Start / Stop running', () => {
    const s = state((st) => {
      st.pads.pads = Array.from({ length: 16 }, () => pad())
      st.pads.pads[9] = pad({ level: 'bright' })
      st.pads.pads[10] = pad({ level: 'bright', anim: 'flash' })
      st.pads.pads[11] = pad({ level: 'off' })
      st.pads.pads[0] = pad({ level: 'bright', anim: 'pulse' })
      running(st)
    })
    const p = pads({ state: s, beats: 0.25 })
    expect(p.pads.map((x) => x.label)).toEqual([
      `Intro${NBSP}I`, `Intro${NBSP}II`, `Intro${NBSP}III`, 'Sync Start', `Ending${NBSP}I`, `Ending${NBSP}II`, `Ending${NBSP}III`, 'Auto Fill',
      `Main${NBSP}A`, `Main${NBSP}B`, `Main${NBSP}C`, `Main${NBSP}D`, 'Break', 'Tap', 'Sync Stop', 'Start / Stop',
    ])
    expect(p.pads[0].state).toBe('armed')
    expect(p.pads[8].state).toBe('idle')
    expect(p.pads[9]).toMatchObject({ state: 'playing', name: 'Main B (pad 10), playing' })
    expect(p.pads[10]).toMatchObject({ state: 'next', name: 'Main C (pad 11), queued' })
    expect(p.pads[11]).toMatchObject({ state: 'dark', name: 'Main D (pad 12) (not in this style)' })
    expect(p.pads[15]).toMatchObject({ family: 'start', state: 'running', name: 'Start / Stop (pad 16), running' })
    expect(p.legend?.map((l) => l.label)).toEqual(['Intro', 'Main', 'Ending', 'Break', 'Fill'])
    expect(p.lit).toBe(true)
    expect(pads({ state: s, beats: 1.75 }).lit).toBe(false)
  })

  it('Start / Stop idle when stopped', () => {
    const p = pads({ state: state(), beats: 0 })
    expect(p.pads[15].state).toBe('idle')
    expect(p.pads[0].state).toBe('dark')
  })

  it('another page: the state\'s captions, an empty pad unused', () => {
    const s = state((st) => {
      st.pads.page = 'racks'
      st.pads.pageName = 'Racks'
      st.pads.pageNumber = 2
      st.pads.pageCount = 5
      st.pads.pages = [
        { page: 'sections', name: 'Sections' },
        { page: 'chord', name: 'Chord' },
        { page: 'racks', name: 'Racks' },
      ]
      st.pads.pads = Array.from({ length: 16 }, () => pad({ label: '' }))
      st.pads.pads[0] = pad({ label: 'RACK 1', level: 'bright' })
      st.pads.pads[1] = pad({ label: 'RACK 2', level: 'dim' })
    })
    const p = pads({ state: s, beats: 0 })
    expect(p.banks).toEqual(['Sections', 'Chord', 'Racks'])
    expect(p.bank).toBe(2)
    expect(p.bankTips).toEqual(['padpage.sections', 'padpage.chord', 'padpage.racks'])
    expect(p.legend).toEqual([])
    expect(p.pads[0]).toEqual({ label: 'RACK 1', family: 'util', state: 'playing', tip: 'padpage.racks', name: 'RACK 1 (pad 1), on' })
    expect(p.pads[1]).toMatchObject({ label: 'RACK 2', state: 'idle', name: 'RACK 2 (pad 2)' })
    expect(p.pads[2]).toEqual({ label: '', family: 'util', state: 'dark', tip: 'launchkey.unused', name: 'Pad 3 unused' })
  })
})

// Each pad page as the mock's engine lights it (mock-pads.ts, the port of src/launchkey.rs
// `looks()`), read the way develop's screen pads read it: the pad's colour, dark when off,
// queued when flashing, armed when pulsing, on when bright, available when dim.
describe('pads, page by page, as develop lit them', () => {
  const fresh = () => new MockSession({ manual: true })
  const face = (s: AppState, i: number) => {
    const p = pads({ state: s, beats: 0 }).pads[i]
    return `${p.family}:${p.state}`
  }
  const page = (m: MockSession, p: PadPage) => m.send({ type: 'setPadPage', page: p })

  it('Sections: utilities in their own colours; Start / Stop red when stopped, green running', () => {
    const m = fresh()
    const s = m.state
    expect(face(s, 0)).toBe(s.style.sections.includes('Intro A') ? 'intro:idle' : 'intro:dark')
    // Sync Start, orange: pulsing (armed) while on, dim (available) while off.
    const sync = (st: AppState) => (st.transport.syncStart ? 'r3:armed' : 'r3:idle')
    expect(face(s, 3)).toBe(sync(s))
    expect(face(s, 7)).toBe(s.transport.autoFill ? 'r1:playing' : 'r1:idle') // Auto Fill, blue
    expect(face(s, 13)).toBe('util:idle') // Tap, grey
    expect(face(s, 14)).toBe(s.transport.syncStop ? 'l:playing' : 'l:idle') // Sync Stop, teal
    expect(face(s, 15)).toBe('ending:playing') // Start / Stop stopped: bright red
    const before = face(s, 3)
    m.send({ type: 'toggleSyncStart' })
    expect(face(m.state, 3)).toBe(sync(m.state))
    expect(face(m.state, 3)).not.toBe(before)
    if (m.state.transport.syncStart) m.send({ type: 'toggleSyncStart' })
    m.send({ type: 'startStop' })
    expect(face(m.state, 15)).toBe('start:running')
  })

  it('Racks: Quick Racks blue when stored, red when loaded, dark when empty; OTS, Bank and Store in the page\'s orange', () => {
    const m = fresh()
    page(m, 'racks')
    const empty = m.state.quickRacks.buttons.findIndex((b) => !b.rack)
    expect(face(m.state, empty)).toBe('r1:dark')
    m.send({ type: 'storeRack', slot: empty })
    page(m, 'racks')
    const loaded = m.state.quickRacks.buttons[empty].loaded
    expect(face(m.state, empty)).toBe(loaded ? 'ending:playing' : 'r1:playing')
    expect(face(m.state, 12)).toBe(m.state.quickRacks.bank > 0 ? 'r3:idle' : 'r3:dark') // Bank −
    expect(face(m.state, 14)).toBe('r3:idle') // Store
    expect(pads({ state: m.state, beats: 0 }).pads[15]).toMatchObject({ family: 'util', state: 'dark' })
    m.send({ type: 'toggleQuickRackStore' })
    expect(face(m.state, 14)).toBe('ending:next') // Store armed: flashing red
  })

  it('Chord: the top row dark, the switches in the page\'s colour, lit when on', () => {
    const m = fresh()
    page(m, 'chord')
    expect(face(m.state, 0)).toBe('util:dark')
    expect(face(m.state, 9)).toBe(m.state.transport.stopAcmp ? 'l:playing' : 'l:idle') // STOP ACMP
    m.send({ type: 'toggleStopAcmp' })
    expect(face(m.state, 9)).toBe(m.state.transport.stopAcmp ? 'l:playing' : 'l:idle')
  })

  it('Setup: the fingering chosen lit in the page\'s pink, the others available', () => {
    const m = fresh()
    page(m, 'setup')
    const chosen = FINGERINGS.findIndex((f) => f.id === m.state.chord.fingering)
    expect(face(m.state, chosen)).toBe('r2:playing')
    expect(face(m.state, (chosen + 1) % 7)).toBe('r2:idle')
  })

  it('Multi Pads: an empty pad dark; Stop available only with data', () => {
    const m = fresh()
    page(m, 'multiPads')
    const lamps = m.state.multiPad.pads.map((p) => p.lamp)
    lamps.forEach((lamp, i) => {
      const expected = { empty: 'r1:dark', ready: 'r1:playing', playing: 'ending:playing', queued: 'r3:next', armed: 'ending:next' }[lamp]
      expect(face(m.state, i), `pad ${i + 1} ${lamp}`).toBe(expected)
    })
  })
})

describe('app bar', () => {
  const bar = (s: AppState, m: Meters | null = null) => appBar({ state: s, meters: m, page: 'stage', dropouts: 0 })

  it('the first failed part that isn\'t missing', () => {
    const s = state((st) => {
      st.keyboardParts[0].plugin = plugin({ status: 'failed', missing: true })
      st.keyboardParts[2].plugin = plugin({ status: 'failed' })
    })
    expect(bar(s).failedPart).toBe(2)
    expect(bar(state()).failedPart).toBeNull()
  })

  it('no synth: synthOn false, no buffer', () => {
    const b = bar(state((s) => (s.io.synth = null)))
    expect(b.synthOn).toBe(false)
    expect(b.bufferFrames).toBeNull()
    expect(bar(state((s) => (s.io.synth!.bufferFrames = 256)))).toMatchObject({ synthOn: true, bufferFrames: 256 })
  })

  it('cpu null without meters or channels; the total with them', () => {
    expect(bar(state()).cpu).toBeNull()
    expect(bar(state(), meters({ channels: [] })).cpu).toBeNull()
    expect(bar(state(), meters({ channels: [{ channel: 1, peak: 0, rms: 0, cpu: 0.1, cpuPeak: 0.1 }] })).cpu).toBe(0.25)
  })
})

describe('display', () => {
  const show = (s: AppState, library: LibraryList = EMPTY_LIBRARY) => display({ state: s, library, pos: 0 })

  it('the sound row: the loaded Quick Rack\'s slot, sound numbers from saved: ids', () => {
    const s = state((st) => {
      st.liveRack.name = 'Ballad'
      st.quickRacks.bank = 0
      st.quickRacks.buttons[0].loaded = true
      st.soundLibrary.patches = [{ id: 'grand', number: 12 } as AppState['soundLibrary']['patches'][number]]
      st.keyboardParts[0].sound = { id: 'saved:grand', name: 'Grand' }
      st.keyboardParts[1].sound = { id: 'saved:gone', name: 'Gone' }
      st.keyboardParts[2].sound = { id: 'plugin:x', name: 'Pluck' }
      st.keyboardParts[3].voiceName = 'Fretless'
    })
    const row = show(s).soundRow
    expect(row.rack).toBe('Ballad')
    expect(row.slot).toBe('A1')
    expect(row.parts.map((p) => `${p.number}:${p.sound}`)).toEqual(['12:Grand', ':Gone', ':Pluck', ':Fretless'])
  })

  it('the slot names the bank and button; none loaded: empty', () => {
    const s = state((st) => {
      st.quickRacks.bank = 1
      st.quickRacks.buttons[2].loaded = true
    })
    expect(show(s).soundRow.slot).toBe('B3')
    expect(show(state()).soundRow.slot).toBe('')
  })

  it('the demo\'s sound row reads the parts\' sounds', () => {
    const s = demo()
    const row = show(s).soundRow
    expect(row.parts.map((p) => p.sound)).toEqual(s.keyboardParts.map((p) => p.sound?.name ?? p.voiceName))
    expect(row.parts.map((p) => p.off)).toEqual([false, false, true, true])
  })

  it('band sends by block, whatever the order', () => {
    const s = state((st) => {
      st.home.bandSends = [
        { block: 'variation', name: 'Variation', effectName: 'Delay', level: 30 },
        { block: 'reverb', name: 'Reverb', effectName: 'Hall', level: 70 },
        { block: 'chorus', name: 'Chorus', effectName: 'Chorus', level: 20 },
      ]
    })
    expect(show(s).styleLine).toMatchObject({ reverb: 70, chorus: 20, delay: 30 })
    expect(show(state()).styleLine).toMatchObject({ reverb: 0, chorus: 0, delay: 0 })
  })

  it('the queued style chip: its name, or "next style" when the library lacks it', () => {
    const lib: LibraryList = { ...EMPTY_LIBRARY, entries: [entry({ id: 7, name: 'Cool Swing', folder: 'Jazz/Swing' }), entry({ id: 3, name: 'Pop', folder: 'Pop/' })] }
    const queued = (id: number | null, library: LibraryList) => show(state((s) => (s.preview.queued = id)), library).styleLine.queued
    expect(queued(7, lib)).toBe('Cool Swing')
    expect(queued(9, lib)).toBe('next style')
    expect(queued(7, EMPTY_LIBRARY)).toBe('next style')
    expect(queued(null, lib)).toBe('')
  })

  it('the category is the folder\'s last segment, then the metre', () => {
    const lib: LibraryList = { ...EMPTY_LIBRARY, entries: [entry({ id: 3, name: 'Pop', folder: 'Pop/Ballad/' })] }
    const s = state((st) => {
      st.style.id = 3
      st.style.timeSignature = [3, 4]
    })
    expect(show(s, lib).styleLine).toMatchObject({ category: 'Ballad', timeSignature: '3/4' })
    expect(show(s).styleLine).toMatchObject({ category: '', timeSignature: '3/4' })
  })

  it('stopped: the Main it starts on, the armed Intro next', () => {
    const s = state((st) => {
      st.transport.main = 2
      st.transport.pendingIntro = 1
    })
    expect(show(s).nowPlaying).toMatchObject({ playing: `Main${NBSP}C`, next: `Intro${NBSP}II`, running: false, bar: 1 })
  })
})

describe('keys', () => {
  it('left and right held notes, the right part\'s hue', () => {
    const s = state((st) => {
      st.keyboard.leftSplit = 54
      st.keyboard.held = [
        { note: 48, zone: 'left', parts: [3] },
        { note: 52, zone: 'left', parts: [] },
        { note: 64, zone: 'right', parts: [] },
        { note: 67, zone: 'right', parts: [1, 0] },
      ]
    })
    const k = keys(s, 61)
    expect(k).toEqual({ range: { low: 36, high: 96 }, split: 54, heldLeft: [48, 52], heldRight: [64, 67], rightPart: 'r2' })
    expect(keys(state(), 49)).toMatchObject({ range: { low: 36, high: 84 }, heldLeft: [], heldRight: [], rightPart: 'r1' })
  })
})
