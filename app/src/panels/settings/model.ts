// The Settings screen's data: pure functions from the app's state to the props of the library's
// `Settings` (app/src/ui/Settings): the page list and one data
// object per page. SettingsScreen.svelte feeds these from the stores; actions.ts turns the pages'
// changes into commands. The old drawer's pages (ChordPage.svelte and the rest, in this folder)
// read the same fields; where they made a choice (what a note says, when a control shows), this
// makes the same one.

import { functionGroups } from '../../lib/api/assignable'
import { settings } from '../../lib/api/settings.svelte'
import { DEFAULT_PAD_PAGES, FINGERINGS, KEYBOARD_PART_NAMES, PAD_PAGES, CHORD_SETTLE_MAX_MS } from '../../lib/api/types'
import type { AppState, Fingering, PadPage } from '../../lib/api/types'
import type {
  ChordPageData,
  FingeringItem,
  KeyboardPageData,
  LaunchkeyPageData,
  PadPageRow,
  PartHue,
  PedalsPageData,
  SettingsPageItem,
  SplitZone,
  StylePageData,
  SystemPageData,
} from '../../ui/Settings/types'
import { noteName, SPLIT_MAX, SPLIT_MIN } from './notes'

/** The split point a reset goes back to (F#2), as the engine starts. */
export const DEFAULT_SPLIT = 54

/** `setAudioBuffer`'s sizes, in frames. */
export const BUFFERS = [64, 128, 256, 512, 1024] as const

const PART_HUES: PartHue[] = ['r1', 'r2', 'r3', 'l']
const PART_SHORT = ['R1', 'R2', 'R3', 'L']

// ── The page list ─────────────────────────────────────────────────────────────────────────

/**
 * The six pages, by name only (the owner: the per-page summaries confused more than they told).
 * Where a page's settings also live (the Launchkey's Chord and Setup pads, the Style knob page,
 * which jack a pedal is on) is in each page's tooltip. The Launchkey page shows as "Controller";
 * its id stays `launchkey`.
 */
export const SETTINGS_PAGES: SettingsPageItem[] = [
  { id: 'chord', label: 'Chord & Split', tip: 'settings.tab.chord' },
  { id: 'style', label: 'Style', tip: 'settings.tab.style' },
  { id: 'keyboard', label: 'Keyboard', tip: 'settings.tab.keyboard' },
  { id: 'pedals', label: 'Pedals', tip: 'settings.tab.controllers' },
  { id: 'system', label: 'System', tip: 'settings.tab.system' },
  { id: 'launchkey', label: 'Controller', tip: 'settings.tab.launchkey' },
]

// ── Chord & Split ─────────────────────────────────────────────────────────────────────────

const ABOUT: Record<Fingering, { tip: string; line: string }> = {
  singleFinger: { tip: 'fingering.single_finger', line: 'One key; keys to its left add m, 7, m7' },
  fingered: { tip: 'fingering.fingered', line: 'Play the whole chord; the root is the bass' },
  fingeredOnBass: { tip: 'fingering.fingered_on_bass', line: 'Your lowest note is the bass: slash chords' },
  multiFinger: { tip: 'fingering.multi_finger', line: 'Single Finger or Fingered shapes, either one' },
  aiFingered: { tip: 'fingering.ai_fingered', line: 'Fewer than three keys still make a chord' },
  fullKeyboard: { tip: 'fingering.full_keyboard', line: 'Chords read across the whole keyboard' },
  aiFullKeyboard: { tip: 'fingering.ai_full_keyboard', line: 'Full Keyboard, guessing from fewer keys' },
}

export const FINGERING_ITEMS: FingeringItem[] = FINGERINGS.map((f) => ({ id: f.id, label: f.name, ...ABOUT[f.id] }))

/** Who plays where: Left below the split, the right-hand parts above it. */
function zones(state: AppState): SplitZone[] {
  const parts = state.keyboardParts.slice(0, 4)
  const zone = (i: number, side: SplitZone['side']): SplitZone | null => {
    const p = parts[i]
    if (!p) return null
    const state_ = !p.sounding ? 'off' : i === 3 && state.transport.acmp ? '+ the chord' : 'on'
    return {
      side,
      part: PART_SHORT[i],
      hue: PART_HUES[i],
      program: p.program + 1,
      sound: p.sound?.name ?? p.voiceName,
      state: state_,
      on: p.sounding,
    }
  }
  return [zone(3, 'Below'), zone(0, 'Above'), zone(1, null), zone(2, null)].filter((z): z is SplitZone => z !== null)
}

/** The Chord & Split page; `picking`: the pick on the main keyboard is armed (../stage/splitPick.svelte.ts). */
export function chordPage(state: AppState, picking = false): ChordPageData {
  const c = state.chord
  return {
    fingerings: FINGERING_ITEMS,
    fingering: c.fingering,
    upper: c.upper,
    manualBass: c.manualBass,
    leftHold: c.leftHold,
    settleMs: c.settleMs,
    settleMax: CHORD_SETTLE_MAX_MS,
    split: c.split,
    splitName: c.splitName,
    splitDefault: DEFAULT_SPLIT,
    splitDefaultName: noteName(DEFAULT_SPLIT),
    splitMin: SPLIT_MIN,
    splitMax: SPLIT_MAX,
    splitLocked: state.paramLocks.splitPoint,
    zones: zones(state),
    picking: picking && !state.paramLocks.splitPoint,
  }
}

// ── Style ─────────────────────────────────────────────────────────────────────────────────

export function stylePage(state: AppState): StylePageData {
  const t = state.transport
  const st = state.styleSettings
  const sc = state.styleChange
  const dyn = state.dynamics
  return {
    mainTiming: st.mainTiming,
    introEndingTiming: st.introEndingTiming,
    otsLinkTiming: state.ots.linkTiming,
    stopAcmp: t.stopAcmpMode,
    tempoChange: sc.tempo,
    partsChange: sc.parts,
    sectionSet: sc.sectionSet,
    sectionReset: st.sectionReset,
    syncStopWindowMs: st.syncStopWindowMs,
    fadeInMs: st.fadeInMs,
    fadeOutMs: st.fadeOutMs,
    fadeHoldMs: st.fadeHoldMs,
    retrigger: t.retrigger,
    retriggerRate: st.retriggerRate,
    swing: st.swing,
    swingGrid: st.swingGrid,
    sectionTempo: st.sectionTempo,
    syncStop: t.syncStop,
    syncStopAvailable: t.syncStopAvailable,
    autoFill: t.autoFill,
    halfBarFill: t.halfBarFill,
    unison: t.unisonLatched,
    unisonType: t.unisonType,
    dynamicsControl: dyn.control,
    dynamicsLevel: dyn.level,
    touch: dyn.touch,
    accent: dyn.accent,
    accentThreshold: dyn.accentThreshold,
    accentMode: dyn.accentMode,
    accentSource: dyn.accentSource,
  }
}

// ── Keyboard ──────────────────────────────────────────────────────────────────────────────

/** A pitch class's name, as the split's note names spell it. */
const pitchName = (semitones: number) => noteName(60 + (((semitones % 12) + 12) % 12)).replace(/-?\d+$/, '')

export function keyboardPage(state: AppState): KeyboardPageData {
  const c = state.chord
  return {
    transposeKeyboard: c.transposeKeyboard,
    transposeMaster: c.transposeMaster,
    youPlay: 'C',
    youHear: pitchName(c.transposeKeyboard + c.transposeMaster),
    lockSplit: state.paramLocks.splitPoint,
    lockFingering: state.paramLocks.fingeringType,
    splitName: c.splitName,
  }
}

// ── Pedals ────────────────────────────────────────────────────────────────────────────────

export function pedalsPage(state: AppState): PedalsPageData {
  const ctl = state.controllers
  return {
    pedals: ctl.pedals.map((p, i) => ({
      cc: p.cc,
      fn: p.function,
      controlType: p.controlType,
      reverse: p.reverse,
      range: p.range,
      learning: ctl.learning === i,
      down: p.down,
    })),
    // Only what yahaha has: the old picker listed the rest as "(not available)", disabled.
    functions: functionGroups()
      .map((g) => ({
        group: g.name,
        items: g.functions
          .filter((f) => f.available)
          // Range applies to Pitch Bend, Control Type to switches (the old page's rule).
          .map((f) => ({ id: f.id, label: f.name, switchKind: f.kind === 'switch', bend: f.id === 'pitchBend' })),
      }))
      .filter((g) => g.items.length > 0),
    parts: ctl.parts.slice(0, 4).map((p, i) => ({
      name: KEYBOARD_PART_NAMES[i],
      hue: PART_HUES[i],
      sustain: p.sustain,
      pitchBend: p.pitchBend,
      modulation: p.modulation,
      bendRange: p.bendRange,
    })),
  }
}

// ── System ────────────────────────────────────────────────────────────────────────────────

/** "MK4 61" from the Launchkey's port name; "" when it has none. */
function launchkeyModel(inputs: string[]): string {
  for (const name of inputs) {
    const m = /Launchkey\s+(?:(Mini)\s+)?(?:(MK\d+)\s+)?(\d+)/i.exec(name)
    if (m) return [m[1], m[2], m[3]].filter(Boolean).join(' ')
  }
  return ''
}

/** `app.cpu`: the meters' CPU share, 0–1 (null: not measured). */
export function systemPage(state: AppState, app: { theme: 'dark' | 'light'; cpu: number | null; dropouts: number }): SystemPageData {
  const synth = state.io.synth
  const view = settings.view(state)
  const rate = synth?.sampleRate || 48000
  const pairs = synth ? Math.max(1, Math.floor(synth.channels / 2)) : 1
  const connected = state.pads.connected
  const latency = synth?.bufferFrames ? (synth.bufferFrames / rate) * 1000 : null
  return {
    synthRunning: synth !== null,
    synthOn: synth !== null && !synth.muted,
    outputPairs: Array.from({ length: pairs }, (_, i) => ({ first: i * 2 + 1, label: `${i * 2 + 1}–${i * 2 + 2}` })),
    outputFirst: synth?.outputPair[0] ?? null,
    buffers: [...BUFFERS],
    buffer: synth?.bufferFrames ?? null,
    latencyMs: latency === null ? null : latency < 10 ? latency.toFixed(1) : latency.toFixed(0),
    sampleRateKhz: synth ? (synth.sampleRate / 1000).toFixed(1).replace(/\.0$/, '') : null,
    master: state.mixer.master,
    // The meters give the load as a share of the buffer's time (1 = all of it); the page shows percent.
    cpu: app.cpu === null ? null : Math.round(app.cpu * 100),
    dropouts: app.dropouts,
    allInputs: view.allInputs,
    inputsFixed: view.mocked.inputs,
    inputs: view.sources.map((s) => ({ name: s.name, listening: s.listening, pads: s.pads })),
    outputPort: state.io.outputPort,
    launchkeyConnected: connected,
    launchkeyName: connected ? launchkeyModel(state.io.inputs) : '',
    paletteLeds: view.paletteLeds,
    ledsFixed: view.mocked.paletteLeds,
    styleFolders: view.roots,
    styleCount: state.library.count,
    scanning: view.scanning,
    rescanFixed: view.mocked.library,
    soundFonts: view.soundFonts,
    soundFontMain: view.soundFontFile,
    theme: app.theme,
  }
}

// ── Launchkey ─────────────────────────────────────────────────────────────────────────────

/** What each pad page's pads do (the Launchkey board). */
export const PAD_PAGE_PADS: Record<PadPage, string> = {
  sections: 'Intro, Main, Ending, Fill, Break, Sync, Tap, Start/Stop',
  racks: 'Quick Racks 1–8, OTS 1–4, Bank −, Bank +, Store',
  chord: 'Manual Bass, Stop ACMP, Split −/+, Kbd Tr −/+, Tr Reset, Retrigger',
  setup: 'The 7 fingerings, Upper, OTS Link, ACMP Style, ACMP Fixed',
  multiPads: 'Pad 1–4, Stop; Select 1–4, Stop 1–4',
}

export function isDefaultPadOrder(order: PadPage[]): boolean {
  return order.length === DEFAULT_PAD_PAGES.length && order.every((p, i) => p === DEFAULT_PAD_PAGES[i])
}

export function launchkeyPage(state: AppState): LaunchkeyPageData {
  const order: PadPage[] = state.settings.padPages.filter((p) => p !== 'sections')
  const left = DEFAULT_PAD_PAGES.filter((p) => !order.includes(p))
  const row = (id: PadPage, shown: boolean): PadPageRow => ({
    id,
    label: PAD_PAGES.find((p) => p.id === id)?.name ?? id,
    pads: PAD_PAGE_PADS[id],
    shown,
  })
  return {
    pages: [...order.map((p) => row(p, true)), ...left.map((p) => row(p, false))],
    sectionsPads: PAD_PAGE_PADS.sections,
    isDefault: isDefaultPadOrder(state.settings.padPages),
  }
}
