// The Settings screen's data: the pure functions from AppState to the library Settings' props.

import { describe, expect, it } from 'vitest'
import { FUNCTIONS } from '../../lib/api/assignable'
import { MockSession } from '../../lib/api/mock'
import { DEFAULT_PAD_PAGES, FINGERINGS, type AppState } from '../../lib/api/types'
import {
  chordPage,
  DEFAULT_SPLIT,
  keyboardPage,
  keysSpan,
  launchkeyPage,
  nowPlayingCompact,
  pedalsPage,
  settingsPages,
  stylePage,
  systemPage,
} from './model'
import { firstTab, nav, PAGE_OF_TAB, TABS } from './nav.svelte'
import { SPLIT_MAX, SPLIT_MIN } from './notes'

function mockState(edit?: (s: AppState) => void): AppState {
  const session = new MockSession({ demo: true, manual: true })
  session.advance(16)
  const s = structuredClone(session.state)
  session.dispose()
  edit?.(s)
  return s
}

const APP = { theme: 'dark' as const, cpu: 12, dropouts: 0 }

describe('settingsPages', () => {
  it('lists the six pages with their labels, captions and tips', () => {
    const pages = settingsPages(mockState())
    expect(pages.map((p) => p.id)).toEqual(['chord', 'style', 'keyboard', 'pedals', 'system', 'launchkey'])
    expect(pages.map((p) => p.label)).toEqual(['Chord & Split', 'Style', 'Keyboard', 'Pedals', 'System', 'Launchkey'])
    expect(pages.map((p) => p.tip)).toEqual([
      'settings.tab.chord',
      'settings.tab.style',
      'settings.tab.keyboard',
      'settings.tab.controllers',
      'settings.tab.system',
      'settings.tab.launchkey',
    ])
    expect(pages[0].also).toBe('Also on Pads · Chord and Setup pages')
    expect(pages[3].also).toBe('P1 Launchkey jack · P2 P3 any MIDI input')
    expect(pages[4].also).toBe('Audio · MIDI · Library')
  })

  it('summarises what each page is set to', () => {
    const s = mockState((s) => {
      s.chord.fingeringName = 'Fingered'
      s.chord.splitName = 'F#2'
      s.styleSettings.mainTiming = 'nextBar'
      s.chord.transposeKeyboard = 2
      s.chord.transposeMaster = -1
      s.paramLocks = { splitPoint: true, fingeringType: false }
      s.controllers.pedals = s.controllers.pedals.map((p, i) => ({ ...p, cc: [64, 66, null][i] }))
      s.io.synth = s.io.synth && { ...s.io.synth, bufferFrames: 128 }
      s.io.allInputs = true
      s.library.count = 1284
      s.settings.padPages = ['racks', 'chord', 'setup']
    })
    const [chord, style, keyboard, pedals, system, launchkey] = settingsPages(s).map((p) => p.summary)
    expect(chord).toBe('Fingered · F#2')
    expect(style).toBe('Next bar')
    expect(keyboard).toBe('+2 · −1 · Split locked')
    expect(pedals).toBe('64 66 —')
    expect(system).toBe(`${s.io.synth ? '128' : 'No synth'} · All inputs · 1,284 styles`)
    expect(launchkey).toBe('4 of 5 pad pages')
    expect(settingsPages(s)[5].also).toBe('Pad pages shown 4 of 5')
  })
})

describe('nowPlayingCompact', () => {
  it('shows the style, tempo, chord in two runs and the section the band starts on', () => {
    const s = mockState((s) => {
      s.transport.running = false
      s.transport.main = 1
      s.transport.tempo = 119.6
      s.chord.name = 'Am7'
    })
    const n = nowPlayingCompact(s)
    expect(n.style).toBe(s.style.name)
    expect(n.bpm).toBe(120)
    expect(n.chord).toBe('Am')
    expect(n.ext).toBe('7')
    expect(n.section).toBe('Main B')
    expect(n.hue).toBe('main')
  })
})

describe('chordPage', () => {
  it('carries the chord state, the seven fingerings and the split range', () => {
    const s = mockState((s) => {
      s.chord.fingering = 'fingeredOnBass'
      s.chord.upper = true
      s.chord.settleMs = 12
      s.chord.split = 60
      s.chord.splitName = 'C3'
      s.paramLocks.splitPoint = true
    })
    const c = chordPage(s, 61)
    expect(c.fingerings.map((f) => f.id)).toEqual(FINGERINGS.map((f) => f.id))
    expect(c.fingerings[2]).toMatchObject({ label: 'Fingered On Bass', tip: 'fingering.fingered_on_bass', line: 'Your lowest note is the bass: slash chords' })
    expect(c).toMatchObject({ fingering: 'fingeredOnBass', upper: true, settleMs: 12, settleMax: 30, split: 60, splitName: 'C3', splitLocked: true })
    expect([c.splitDefault, c.splitDefaultName]).toEqual([DEFAULT_SPLIT, 'F#2'])
    expect([c.splitMin, c.splitMax]).toEqual([SPLIT_MIN, SPLIT_MAX])
    expect([c.keysLow, c.keysHigh]).toEqual([36, 95])
  })

  it('puts Left below the split and the right-hand parts above, off parts faded', () => {
    const s = mockState((s) => {
      s.transport.acmp = true
      s.keyboardParts[3].sounding = true
      s.keyboardParts[1].sounding = false
      s.keyboardParts[0].program = 40
    })
    const z = chordPage(s).zones
    expect(z.map((x) => [x.side, x.part, x.hue])).toEqual([
      ['Below', 'L', 'l'],
      ['Above', 'R1', 'r1'],
      [null, 'R2', 'r2'],
      [null, 'R3', 'r3'],
    ])
    expect(z[0].state).toBe('+ the chord')
    expect(z[1].program).toBe(41)
    expect(z[2]).toMatchObject({ state: 'off', on: false })
  })

  it('spans each key range from a C to a B', () => {
    expect(keysSpan(49)).toEqual({ low: 36, high: 83 })
    expect(keysSpan(88)).toEqual({ low: 24, high: 107 })
  })
})

describe('stylePage', () => {
  it('reads every style setting from where the engine keeps it', () => {
    const s = mockState((s) => {
      s.styleSettings.mainTiming = 'immediate'
      s.ots.linkTiming = 'mainChange'
      s.transport.stopAcmpMode = 'fixed'
      s.styleChange = { tempo: 'hold', parts: 'reset', sectionSet: 2 }
      s.styleSettings.fadeInMs = 4000
      s.transport.unisonLatched = true
      s.transport.unison = false
      s.dynamics.level = 90
      s.dynamics.accentSource = 'both'
    })
    expect(stylePage(s)).toMatchObject({
      mainTiming: 'immediate',
      otsLinkTiming: 'mainChange',
      stopAcmp: 'fixed',
      tempoChange: 'hold',
      partsChange: 'reset',
      sectionSet: 2,
      fadeInMs: 4000,
      unison: true,
      dynamicsLevel: 90,
      accentSource: 'both',
    })
  })
})

describe('keyboardPage', () => {
  it('says what a C sounds as, after both transposes', () => {
    const s = mockState((s) => {
      s.chord.transposeKeyboard = 2
      s.chord.transposeMaster = 4
      s.paramLocks = { splitPoint: false, fingeringType: true }
    })
    expect(keyboardPage(s)).toMatchObject({ transposeKeyboard: 2, transposeMaster: 4, youPlay: 'C', youHear: 'F#', lockSplit: false, lockFingering: true })
    s.chord.transposeMaster = -3
    expect(keyboardPage(s).youHear).toBe('B')
  })
})

describe('pedalsPage', () => {
  it('lists only the available functions, marking switches and Pitch Bend', () => {
    const p = pedalsPage(mockState())
    const items = p.functions.flatMap((g) => g.items)
    expect(items.length).toBe(FUNCTIONS.filter((f) => f.available).length)
    expect(items.some((f) => FUNCTIONS.find((x) => x.id === f.id)?.available === false)).toBe(false)
    const sustain = items.find((f) => f.id === 'sustain')!
    expect(sustain.switchKind).toBe(FUNCTIONS.find((f) => f.id === 'sustain')!.kind === 'switch')
    expect(items.find((f) => f.id === 'pitchBend')?.bend ?? true).toBe(true)
    expect(items.filter((f) => f.bend).every((f) => f.id === 'pitchBend')).toBe(true)
  })

  it('shows the pedals, the one learning, and each part\'s reach', () => {
    const s = mockState((s) => {
      s.controllers.learning = 1
      s.controllers.parts[3] = { sustain: false, pitchBend: true, modulation: false, bendRange: 7 }
    })
    const p = pedalsPage(s)
    expect(p.pedals.map((x) => x.learning)).toEqual([false, true, false])
    expect(p.pedals[0].fn).toBe(s.controllers.pedals[0].function)
    expect(p.parts[3]).toEqual({ name: 'Left', hue: 'l', sustain: false, pitchBend: true, modulation: false, bendRange: 7 })
  })
})

describe('systemPage', () => {
  it('reads the synth, the inputs and the library', () => {
    const s = mockState((s) => {
      s.io.synth = s.io.synth && { ...s.io.synth, channels: 6, sampleRate: 48000, bufferFrames: 128, outputPair: [3, 4], muted: true }
      s.io.sources = [
        { name: 'Launchkey MK4 61 MIDI', listening: true, pads: false },
        { name: 'Launchkey MK4 61 (pads)', listening: false, pads: true },
      ]
      s.io.inputs = ['Launchkey MK4 61 MIDI']
      s.io.allInputs = false
      s.pads.connected = true
      s.library.count = 42
      s.library.roots = ['/styles']
    })
    const sys = systemPage(s, { theme: 'light', cpu: 80, dropouts: 2 })
    expect(sys.synthRunning).toBe(true)
    expect(sys.synthOn).toBe(false)
    expect(sys.outputPairs).toEqual([
      { first: 1, label: '1–2' },
      { first: 3, label: '3–4' },
      { first: 5, label: '5–6' },
    ])
    expect(sys.outputFirst).toBe(3)
    expect([sys.buffer, sys.latencyMs, sys.sampleRateKhz]).toEqual([128, '2.7', '48'])
    expect(sys.inputs.map((i) => [i.name, i.listening, i.pads])).toEqual([
      ['Launchkey MK4 61 MIDI', true, false],
      ['Launchkey MK4 61 (pads)', false, true],
    ])
    expect(sys).toMatchObject({ allInputs: false, inputsFixed: false, launchkeyConnected: true, launchkeyName: 'MK4 61', styleCount: 42, styleFolders: ['/styles'] })
    expect(sys).toMatchObject({ theme: 'light', cpu: 80, dropouts: 2 })
  })

  it('without the synth: not running, nothing measured', () => {
    const sys = systemPage(mockState((s) => (s.io.synth = null)), APP)
    expect(sys).toMatchObject({ synthRunning: false, synthOn: false, buffer: null, latencyMs: null, sampleRateKhz: null, outputFirst: null })
  })
})

describe('launchkeyPage', () => {
  it('lists the shown pages in order, then the ones left out', () => {
    const s = mockState((s) => (s.settings.padPages = ['setup', 'racks']))
    const l = launchkeyPage(s)
    expect(l.pages.map((p) => [p.id, p.shown])).toEqual([
      ['setup', true],
      ['racks', true],
      ['chord', false],
      ['multiPads', false],
    ])
    expect(l.pages[1]).toMatchObject({ label: 'Racks', pads: 'Quick Racks 1–8, OTS 1–4, Bank −, Bank +, Store' })
    expect(l.sectionsPads).toBe('Intro, Main, Ending, Fill, Break, Sync, Tap, Start/Stop')
    expect(l.isDefault).toBe(false)
    expect(launchkeyPage(mockState((s) => (s.settings.padPages = [...DEFAULT_PAD_PAGES]))).isDefault).toBe(true)
  })
})

describe('nav: the six pages over the old tabs', () => {
  it('maps every tab to its page, and a page to its first tab', () => {
    expect(TABS.every((t) => PAGE_OF_TAB[t.id])).toBe(true)
    expect([firstTab('chord'), firstTab('keyboard'), firstTab('system'), firstTab('launchkey')]).toEqual(['chord', 'transpose', 'audio', 'launchkey'])
    const was = nav.tab
    nav.tab = 'midi'
    expect(nav.page).toBe('system')
    nav.page = 'keyboard'
    expect(nav.tab).toBe('transpose')
    nav.tab = 'lock'
    expect(nav.page).toBe('keyboard')
    nav.tab = was
  })
})
