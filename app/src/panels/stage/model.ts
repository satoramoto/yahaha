// The Stage screen's data: pure functions from the app's state to the props of each region of
// the library's `Stage` (app/src/ui/Stage). The library components are store-free; this is
// where `AppState` (docs/app-api.md) becomes what they draw. StageScreen.svelte feeds these
// from the stores; actions.ts sends what the controls ask for.
//
// The rules are the Stage spec's (docs/specs/push/Stage.md and kit.md): each function names
// the section it follows.

import type { ComponentProps } from 'svelte'
import type { HeldNote, KnobPage, LibraryList, Meters, Pad, PadPage, SurfaceControl, SurfaceFader } from '../../lib/api/types'
import { BREAK, KEYBOARD_PART_NAMES, type AppState, type FaderLayer, type KeyboardPart } from '../../lib/api/types'
import type { KeyRange } from '../../lib/store.svelte'
import { RANGES } from '../keystrip/keyboard'
import type { TabItem } from '../../ui/ChosenTabs/types'
import type { BankLamp, FaderStrip } from '../../ui/FaderBank/types'
import { firstFailedPart } from '../../ui/HealthSlot/health'
import type { KnobItem } from '../../ui/KnobBank/types'
import type { LegendItem, PadItem } from '../../ui/PadBank/types'
import type Stage from '../../ui/Stage/Stage.svelte'
import type { StatusHint } from '../../ui/StatusLine/StatusLine.svelte'
import { TIPS, keyLabel, type TipKey } from '../../help/tooltips'

type StageProps = ComponentProps<typeof Stage>

/** What the Stage reads besides the state. */
export interface StageInput {
  state: AppState
  /** `app.library`: the style list (category, the queued style's name). */
  library: LibraryList
  /** The latest meters frame; null draws every meter empty. */
  meters: Meters | null
  /** Held peaks, strips 1–9, linear (`holdPeak`); a missing entry is 0. */
  holds: number[]
  /** The chosen page tab. */
  page: string
  /** The Shift layer (`ui.shift`). */
  shift: boolean
  /** Help mode (`tips.help`). */
  help: boolean
  /** The key strip's range. */
  keyRange: KeyRange
  /** Audio dropouts in the last 30 s, 0–3. */
  dropouts: number
  /** The LED clock (`clock.beats`): queued and armed pads flash on it. */
  beats: number
  /** Quarter notes into the section playing (`clock.pos`; 0 stopped). */
  pos: number
}

/** The Stage's data props (every region; the callbacks come from actions.ts). */
export type StageData = Pick<StageProps, 'appBar' | 'sectionRow' | 'display' | 'faders' | 'knobs' | 'pads' | 'status' | 'keys'>

export function stageData(input: StageInput): StageData {
  return {
    appBar: appBar(input),
    sectionRow: sectionRow(input),
    display: display(input),
    faders: faders(input),
    knobs: knobs(input),
    pads: pads(input),
    status: status(input.state),
    keys: keys(input.state, input.keyRange),
  }
}

// ── App bar (kit › App bar) ───────────────────────────────────────────────────────────────

/** The display pages, left of the hairline. */
export const DISPLAY_TABS: TabItem[] = [
  { id: 'stage', label: 'Stage', tip: 'view.stage' },
  { id: 'channel', label: 'Channel', tip: 'nav.channel' },
  { id: 'effects', label: 'Effects', tip: 'nav.effects' },
  { id: 'quickRacks', label: 'Quick Racks', tip: 'nav.quick' },
  { id: 'multiPads', label: 'Multi Pads', tip: 'nav.multipad' },
  { id: 'looper', label: 'Looper', tip: 'nav.looper' },
  { id: 'harmArp', label: 'Harm/Arp', tip: 'nav.harmony' },
]

/** The full pages, after the separator. */
export const FULL_TABS: TabItem[] = [
  { id: 'library', label: 'Library', tip: 'view.library' },
  { id: 'settings', label: 'Settings', tip: 'nav.settings' },
]

/** Every page tab's id. */
export const PAGES = [...DISPLAY_TABS, ...FULL_TABS].map((t) => t.id)

export function appBar(input: Pick<StageInput, 'state' | 'meters' | 'page' | 'dropouts'>): StageProps['appBar'] {
  const { state, meters } = input
  return {
    displayTabs: DISPLAY_TABS,
    fullTabs: FULL_TABS,
    chosen: input.page,
    launchkey: state.pads.connected,
    failedPart: firstFailedPart(state.keyboardParts.map((p) => p.plugin)),
    synthOn: state.io.synth !== null,
    dropouts: input.dropouts,
    bufferFrames: state.io.synth?.bufferFrames ?? null,
    // No CPU before the first frame with channels (no synth: an empty frame).
    cpu: meters && meters.channels.length > 0 ? meters.cpu.total : null,
  }
}

// ── Section row (kit › Section row) ───────────────────────────────────────────────────────

export function sectionRow(input: Pick<StageInput, 'state' | 'help'>): StageProps['sectionRow'] {
  const { state } = input
  const fade = state.transport.fade
  return {
    running: state.transport.running,
    accomp: state.transport.acmp,
    syncStart: state.transport.syncStart,
    fading: fade === 'fadingIn' || fade === 'fadingOut' || fade === 'holding',
    metronome: state.metronome.on,
    metronomeOpen: false,
    unison: state.transport.unison,
    help: input.help,
  }
}

// ── Display (Stage.md › Display) ──────────────────────────────────────────────────────────

const NBSP = ' '
const ROMAN: Record<string, string> = { A: 'I', B: 'II', C: 'III', D: 'IV' }

type Hue = 'intro' | 'main' | 'ending' | 'brk' | 'fill'

/**
 * A section's name the Genos way (kit › Section names): Intro/Ending A–D → I–IV, Main A–D
 * as it is, Fill In BA → Break, any other fill → Fill; anything else as given. A no-break
 * space ties a name to its numeral.
 */
export function sectionName(name: string): string {
  if (name === BREAK) return 'Break'
  const ie = /^(Intro|Ending) ([A-D])$/.exec(name)
  if (ie) return `${ie[1]}${NBSP}${ROMAN[ie[2]]}`
  if (/^Fill In [A-D][A-D]$/.test(name)) return 'Fill'
  const main = /^Main ([A-D])$/.exec(name)
  if (main) return `Main${NBSP}${main[1]}`
  return name
}

/** A section's hue family. */
export function sectionHue(name: string | null): Hue {
  if (!name) return 'main'
  if (name === BREAK) return 'brk'
  if (name.startsWith('Intro')) return 'intro'
  if (name.startsWith('Ending')) return 'ending'
  if (name.startsWith('Fill')) return 'fill'
  return 'main'
}

/** A chord name in its two runs (Stage.md › Chord, D30): the root and a leading m / dim /
 * aug, then the rest ("Am7" → "Am" + "7", "Cmaj7" → "C" + "maj7"). */
export function splitChord(name: string | null): { chord: string; extension: string } {
  if (!name) return { chord: '', extension: '' }
  const m = /^([A-G][#b]?)(.*)$/.exec(name)
  if (!m) return { chord: name, extension: '' }
  const [, root, rest] = m
  const quality = /^(dim|aug)/.exec(rest)?.[1] ?? (rest.startsWith('m') && !rest.startsWith('maj') ? 'm' : '')
  return { chord: root + quality, extension: rest.slice(quality.length) }
}

const SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const FLATS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
const INTERVALS = ['R', 'b9', '9', 'm3', '3', '4', 'b5', '5', '#5', '6', 'm7', 'M7']

/** The tones of the chord shown, root first, at most six, with their intervals (Stage.md › Chord). */
export function chordNotes(state: Pick<AppState, 'chord' | 'keyboard'>): { note: string; interval: string }[] {
  const { chord, keyboard } = state
  if (!chord.name || keyboard.chordTones.length === 0) return []
  const t = chord.transposeKeyboard
  const pcs = keyboard.chordTones.slice(0, 6).map((pc) => (((pc + t) % 12) + 12) % 12)
  const root = pcs[0]
  const rootName = /^[A-G][#b]?/.exec(chord.name)?.[0] ?? ''
  const names = rootName.includes('b') || rootName === 'F' ? FLATS : SHARPS
  const steps = pcs.map((pc) => (pc - root + 12) % 12)
  const bothThirds = steps.includes(3) && steps.includes(4)
  return pcs.map((pc, i) => ({
    note: names[pc],
    interval: bothThirds && steps[i] === 3 ? '#9' : INTERVALS[steps[i]],
  }))
}

/** "Rock · 4/4": the last folder segment of the style's library entry and its metre (D44). */
function styleMeta(state: AppState, library: LibraryList): { category: string; timeSignature: string } {
  const [n, d] = state.style.timeSignature
  const entry = library.entries.find((e) => e.id === state.style.id)
  const category = entry?.folder.split('/').filter(Boolean).pop() ?? ''
  return { category, timeSignature: `${n}/${d}` }
}

/** The band's send to a block, from `home.bandSends` (by block, never by index). */
function bandSend(state: AppState, block: string): number {
  return state.home.bandSends.find((s) => s.block === block)?.level ?? 0
}

/** The bar of the section playing, 1-based: a looping Main counts on past its length, so
 * this is the bar within the pattern. */
export function sectionBar(t: AppState['transport']): number {
  const bar = Math.max(1, t.bar)
  return t.sectionBars ? ((bar - 1) % t.sectionBars) + 1 : bar
}

/** What the count row says about when the change lands (kit › Count row, item 4; D5). */
export function whenText(state: AppState): string {
  const t = state.transport
  if (!t.running) return t.syncStart ? 'sync start' : ''
  const bar = sectionBar(t)
  if (t.landing !== null) {
    const breakNext = t.queued === BREAK || t.section === BREAK
    return `${breakNext ? 'break' : 'fill'} after bar ${bar}`
  }
  const q = t.queued
  if (!q) return ''
  if (/^(Intro|Ending)/.test(q) && state.styleSettings.introEndingTiming === 'endOfSection') return `after bar ${t.sectionBars ?? bar}`
  if (q.startsWith('Main') && state.styleSettings.mainTiming === 'immediate') return 'next beat'
  return `after bar ${bar}`
}

/** The beat of the bar (1-based; 0 stopped) and how far through the bar, from the section
 * clock's position `pos` (quarter notes into the section, `clock.pos`). */
export function beatOf(state: AppState, pos: number): { beat: number; beats: number; progress: number } {
  const beats = state.surface.clock.beatsPerBar || state.transport.beatsPerBar || 4
  if (!state.transport.running) return { beat: 0, beats, progress: 0 }
  const p = Math.max(0, pos)
  return { beat: (Math.floor(p) % beats) + 1, beats, progress: (p % beats) / beats }
}

export function display(input: Pick<StageInput, 'state' | 'library' | 'pos'>): StageProps['display'] {
  const { state, library } = input
  const t = state.transport
  const queuedId = state.preview.queued
  const queuedName = queuedId === null ? '' : (library.entries.find((e) => e.id === queuedId)?.name ?? 'next style')

  // Playing: the section, or stopped the Main the band starts on (D4).
  const playingRaw = t.running && t.section ? t.section : `Main ${'ABCD'[t.main] ?? 'A'}`
  const nextRaw = t.running ? (t.landing ?? t.queued) : t.pendingIntro !== null ? `Intro ${'ABCD'[t.pendingIntro]}` : null

  const chord = splitChord(state.chord.name)
  const played = state.chord.fingered && state.chord.fingered !== state.chord.name ? ` · played ${state.chord.fingered}` : ''

  return {
    styleLine: {
      styleName: state.style.name,
      ...styleMeta(state, library),
      queued: queuedName,
      oneTouch: state.ots.applied,
      reverb: bandSend(state, 'reverb'),
      chorus: bandSend(state, 'chorus'),
      delay: bandSend(state, 'variation'),
    },
    nowPlaying: {
      chord: { ...chord, notes: chordNotes(state), fingering: state.chord.fingeringName + played },
      playing: sectionName(playingRaw),
      hue: sectionHue(playingRaw),
      next: nextRaw ? sectionName(nextRaw) : '',
      fill: whenText(state),
      bar: t.running ? sectionBar(t) : 1,
      bars: t.sectionBars ?? 1,
      ...beatOf(state, input.pos),
      bpm: Math.round(t.tempo),
      running: t.running,
    },
    soundRow: soundRow(state),
  }
}

const PART_IDS = ['right1', 'right2', 'right3', 'left'] as const
const PART_SHORT = ['R1', 'R2', 'R3', 'L']
const PART_HUES = ['r1', 'r2', 'r3', 'l'] as const

/** The sound's number in the library: the patch `saved:<id>` names (Stage.md › Sounds row). */
function soundNumber(state: AppState, part: KeyboardPart): string {
  const id = part.sound?.id
  if (!id?.startsWith('saved:')) return ''
  const patch = state.soundLibrary.patches.find((p) => p.id === id.slice('saved:'.length))
  return patch ? String(patch.number) : ''
}

const failed = (p: KeyboardPart) => p.plugin?.status === 'failed' && p.plugin.missing !== true

function soundRow(state: AppState): StageProps['display']['soundRow'] {
  const quick = state.quickRacks
  const loaded = quick.buttons.findIndex((b) => b.loaded)
  return {
    rack: state.liveRack.name,
    slot: loaded < 0 ? '' : `${String.fromCharCode(65 + quick.bank)}${loaded + 1}`,
    modified: state.liveRack.modified,
    parts: state.keyboardParts.slice(0, 4).map((p, i) => ({
      id: PART_IDS[i],
      part: PART_SHORT[i],
      partName: KEYBOARD_PART_NAMES[i],
      hue: PART_HUES[i],
      number: soundNumber(state, p),
      sound: p.sound?.name ?? p.voiceName,
      off: !p.sounding,
      edited: p.soundEdited === true,
      missing: p.plugin?.missing === true,
      failed: failed(p),
      bass: p.playsBass,
    })),
  }
}

// ── Faders (kit › Faders, FaderStrip, Lamp row) ───────────────────────────────────────────

export const PAGE_TABS: TabItem[] = [
  { id: 'panel', label: 'Panel', tip: 'mixer.page' },
  { id: 'style', label: 'Style', tip: 'mixer.page' },
]

export const LAYER_TABS: TabItem[] = [
  { id: 'volume', label: 'Vol', name: 'Volume', tip: 'mixer.layer' },
  { id: 'pan', label: 'Pan', tip: 'mixer.layer' },
  { id: 'reverb', label: 'Reverb', name: 'Reverb send', tip: 'mixer.layer' },
  { id: 'chorus', label: 'Chorus', name: 'Chorus send', tip: 'mixer.layer' },
  { id: 'delay', label: 'Delay', name: 'Delay send', tip: 'mixer.layer' },
]

/** The engine's label for each keyboard part's fader: another label is a rack target (D63). */
const PART_FADER_LABELS = ['RIGHT 1', 'RIGHT 2', 'RIGHT 3', 'LEFT']
const LAYER_SHORT: Record<FaderLayer, string> = { volume: '', pan: '', reverb: 'Rev', chorus: 'Cho', delay: 'Dly' }
const PART_LAYER_TIP: Record<FaderLayer, string | null> = {
  volume: null,
  pan: 'mixer.part.pan',
  reverb: 'mixer.part.reverb',
  chorus: 'mixer.part.chorus',
  delay: 'mixer.part.variation',
}
const STYLE_LAYER_TIP: Record<FaderLayer, string> = {
  volume: 'mixer.style.volume',
  pan: 'mixer.style.volume',
  reverb: 'mixer.style.reverb',
  chorus: 'mixer.style.chorus',
  delay: 'mixer.style.variation',
}

/** A strip's value as it shows on a layer: "90", pan "C" / "L20" / "R20", a send "Rev 40". */
export function valueText(layer: FaderLayer, value: number): string {
  if (layer === 'pan') return value === 64 ? 'C' : value < 64 ? `L${64 - value}` : `R${value - 64}`
  const short = LAYER_SHORT[layer]
  return short ? `${short} ${value}` : `${value}`
}

/** A linear amplitude as a share of the meter's travel, on −60…0 dBFS (D7). */
export function meterFraction(x: number): number {
  if (!(x > 0)) return 0
  return Math.min(1, Math.max(0, (20 * Math.log10(x) + 60) / 60))
}

/** The held peak (kit › FaderStrip, `holdPeak`): 1.5 s, then falling 20 dB/s; no timer. */
export interface HoldState {
  peak: number
  sinceMs: number
}

export function holdPeak(prev: HoldState | undefined, peak: number, atMs: number): HoldState {
  if (!prev || peak >= prev.peak) return { peak, sinceMs: atMs }
  const fallen = prev.peak * 10 ** (-Math.max(0, atMs - prev.sinceMs - 1500) / 1000)
  return peak >= fallen ? { peak, sinceMs: atMs } : { peak: fallen, sinceMs: prev.sinceMs }
}

/** The peak and RMS each of the nine strips' meters reads (D7): a part its channel, a group
 * its channels' largest, Master the louder side. Strips 7 and 8 read nothing. */
export function stripMeters(state: AppState, meters: Meters | null): { peak: number; rms: number }[] {
  const none = { peak: 0, rms: 0 }
  if (!meters) return Array.from({ length: 9 }, () => none)
  const of = (channels: number[]) => {
    const found = meters.channels.filter((c) => channels.includes(c.channel))
    return { peak: Math.max(0, ...found.map((c) => c.peak)), rms: Math.max(0, ...found.map((c) => c.rms)) }
  }
  const parts = state.keyboardParts.slice(0, 4).map((p) => of([p.channel]))
  return [
    ...parts,
    of([9, 10, 11, 12, 13, 14, 15, 16]),
    of([5, 6, 7, 8]),
    none,
    none,
    { peak: Math.max(...meters.master), rms: Math.max(...meters.masterRms) },
  ]
}

function parked(i: number): FaderStrip {
  return {
    id: `fader${i + 1}`,
    tag: '—',
    hue: 't',
    kind: 'parked',
    value: '',
    level: 0,
    meter: 0,
    meter2: 0,
    peak: 0,
    faderName: `Fader ${i + 1} unused`,
    tip: 'launchkey.fader_unused',
  }
}

/** The fields every live strip shares: value, level, meters, soft takeover, accessible name. */
function live(f: SurfaceFader, layer: FaderLayer, tag: string, meter: { peak: number; rms: number } | null, hold: number) {
  const level = f.value ?? 0
  const text = valueText(layer, level)
  return {
    value: text,
    level,
    meter: meter ? meterFraction(meter.peak) : 0,
    meter2: meter ? meterFraction(meter.rms) : 0,
    peak: meter ? meterFraction(hold) : 0,
    away: f.waiting && f.position !== null ? f.position : undefined,
    faderName: `${tag} ${text}${f.waiting ? ', hardware fader away' : ''}`,
  }
}

function panelStrips(input: Pick<StageInput, 'state' | 'meters' | 'holds'>): FaderStrip[] {
  const { state } = input
  const layer = state.mixer.faderLayer
  const meters = stripMeters(state, input.meters)
  const faders = state.surface.faders
  return Array.from({ length: 9 }, (_, i): FaderStrip => {
    const f = faders[i]
    if (!f || f.set === null) return i === 8 ? { ...parked(i), id: 'master', tag: 'Master', faderName: 'Master unused (no audio)' } : parked(i)
    const hold = input.holds[i] ?? 0
    if (i < 4) {
      const part = state.keyboardParts[i]
      const rackTarget = f.label !== '' && f.label !== PART_FADER_LABELS[i]
      if (rackTarget) {
        // The live rack maps this fader elsewhere (D63): its label, no meter, opens the Rack.
        return {
          id: PART_IDS[i],
          tag: f.label,
          hue: 't2',
          kind: 'group',
          ...live(f, 'volume', f.label, null, 0),
          tip: 'launchkey.fader_rack',
          openName: `${f.label}: open the Rack`,
          openTip: 'launchkey.fader_rack',
        }
      }
      const tag = KEYBOARD_PART_NAMES[i]
      const sounding = part?.sounding ?? true
      const showMeter = sounding && layer === 'volume'
      return {
        id: PART_IDS[i],
        tag,
        hue: PART_HUES[i],
        kind: sounding ? 'part' : 'off',
        ...live(f, layer, tag, showMeter ? meters[i] : null, hold),
        edited: part?.soundEdited === true,
        missing: part?.plugin?.missing === true,
        failed: part ? failed(part) : false,
        tip: PART_LAYER_TIP[layer] ?? `mixer.panel.${PART_IDS[i]}`,
        openName: `${tag}: open Channel`,
        openTip: 'mixer.strip.select',
      }
    }
    if (i === 4) {
      return {
        id: 'style', tag: 'Style', hue: 'a', kind: 'group', ...live(f, 'volume', 'Style', meters[4], hold),
        tip: 'mixer.style_level', openName: 'Style: show the Style faders', openTip: 'mixer.page',
      }
    }
    if (i === 5) {
      return {
        id: 'multiPad', tag: 'Multi Pad', hue: 't2', kind: 'group', ...live(f, 'volume', 'Multi Pad', meters[5], hold),
        tip: 'mixer.pad_level', openName: 'Multi Pad: open Multi Pads', openTip: 'nav.multipad',
      }
    }
    if (i === 8) {
      return {
        id: 'master', tag: 'Master', hue: 't', kind: 'master', ...live(f, 'volume', 'Master', meters[8], hold),
        tip: 'mixer.master', openName: 'Master: open Effects', openTip: 'fx.master_edit',
      }
    }
    // Faders 7 and 8 are unused on Panel; if the engine maps them, show what it sends.
    return {
      id: `fader${i + 1}`, tag: f.label, hue: 't2', kind: 'group', ...live(f, 'volume', f.label, null, 0),
      tip: 'launchkey.fader_rack', openName: `${f.label}: open the Rack`, openTip: 'launchkey.fader_rack',
    }
  })
}

/** The Style fader page's fallback until #507 (Stage.md › Band): the Style parts as the
 * engine labels them, no meter; Master as on Panel. */
function styleStrips(input: Pick<StageInput, 'state' | 'meters' | 'holds'>): FaderStrip[] {
  const { state } = input
  const layer = state.mixer.faderLayer
  const panel = panelStrips(input)
  return Array.from({ length: 9 }, (_, i): FaderStrip => {
    if (i === 8) return panel[8]
    const f = state.surface.faders[i]
    if (!f || f.set === null) return parked(i)
    return {
      id: `style${i + 1}`,
      tag: f.label,
      hue: 'a',
      kind: 'group',
      ...live(f, layer, f.label, null, 0),
      tip: STYLE_LAYER_TIP[layer],
      openName: `${f.label}: open Channel`,
      openTip: 'mixer.strip.select',
    }
  })
}

const controlOf = (state: AppState, id: SurfaceControl['id']) => state.surface.controls.find((c) => c.id === id)

/** A Style-page fader button as a lamp: the label the state sends, lit when bright. */
function controlLamp(state: AppState, n: number): BankLamp {
  const c = controlOf(state, `faderButton${n}` as SurfaceControl['id'])
  const label = c?.label || '—'
  return { id: `fb${n}`, label, on: c?.level === 'bright', hue: 'ok', name: label, tip: c?.action ? 'mixer.style.mute' : 'launchkey.fader_unused' }
}

function soundLamp(state: AppState): BankLamp {
  return {
    id: 'sound',
    label: 'Sound',
    on: state.surface.layer.type === 'sound',
    hue: 'm',
    long: true,
    tip: 'launchkey.sound',
    name: 'Sound: hold and the pads become Quick Racks. A click latches it; click again to close',
  }
}

function lamps(state: AppState): { partLamps: BankLamp[]; functionLamps: BankLamp[] } {
  if (state.mixer.faderPage === 'style') {
    return {
      partLamps: [1, 2, 3, 4].map((n) => controlLamp(state, n)),
      functionLamps: [controlLamp(state, 5), soundLamp(state), controlLamp(state, 7), controlLamp(state, 8)],
    }
  }
  const swap = state.surface.layer.type === 'swap' ? state.surface.layer.part : null
  const looper = state.looper.mode
  return {
    partLamps: state.keyboardParts.slice(0, 4).map((p, i): BankLamp => {
      const name = KEYBOARD_PART_NAMES[i]
      return {
        id: PART_IDS[i],
        label: swap === i ? 'Swap' : p.on ? 'On' : 'Off',
        on: p.sounding,
        hue: PART_HUES[i],
        long: true,
        tip: swap === i ? 'part.swap' : `part.${PART_IDS[i]}.on`,
        name: `${name} ${p.sounding ? 'on' : 'off'}. Long press: swap mode (knobs edit this part). Shift: open Channel`,
      }
    }),
    functionLamps: [
      { id: 'harmArp', label: 'Harm/Arp', on: state.harmonyArp.on, hue: 'm', tip: 'harmony.switch', name: 'Harmony/Arpeggio on/off' },
      soundLamp(state),
      { id: 'leftHold', label: 'L Hold', on: state.chord.leftHold, hue: 'm', tip: 'detection.left_hold', name: 'Left Hold on/off' },
      {
        id: 'looper',
        label: 'Looper',
        on: looper === 'looping' || looper === 'recording',
        hue: looper === 'recording' || looper === 'recArmed' ? 't' : 'm',
        long: true,
        tip: 'looper.on_off',
        name: `Chord Looper on/off${looper === 'off' ? '' : `, ${looper}`}. Long press: Loop rec`,
      },
    ],
  }
}

export function faders(input: Pick<StageInput, 'state' | 'meters' | 'holds'>): StageProps['faders'] {
  const { state } = input
  const style = state.mixer.faderPage === 'style'
  return {
    strips: style ? styleStrips(input) : panelStrips(input),
    pageTabs: PAGE_TABS,
    page: state.mixer.faderPage,
    layerTabs: LAYER_TABS,
    layer: state.mixer.faderLayer,
    ...lamps(state),
  }
}

// ── Knobs (kit › Knobs, Knob; D6) ─────────────────────────────────────────────────────────

const KNOB_WORDS: Partial<Record<string, string>> = {
  dynamics: 'Dynamics',
  retriggerRate: 'Retrig rate',
  retriggerOnOff: 'Retrigger',
  trackMuteA: 'Mute A',
  trackMuteB: 'Mute B',
  swing: 'Swing',
  tempo: 'Tempo',
  splitPoint: 'Split',
  harmonyArp: 'Harm/Arp',
  harmonyVolume: 'Harm level',
  metronomeVolume: 'Click level',
  swapSound: 'Sound',
}

export function knobs(input: Pick<StageInput, 'state'>): StageProps['knobs'] {
  const { state } = input
  const k = state.knobs
  return {
    knobs: k.knobs.slice(0, 8).map((knob): KnobItem => {
      if (knob.function === 'none') return { label: '---', code: '', value: '', fraction: 0, unused: true }
      let value = knob.value.replace(/ BPM$/, '')
      let unit: string | undefined
      if (value.endsWith('%')) {
        value = value.slice(0, -1)
        unit = '%'
      }
      const fraction =
        knob.level !== null ? knob.level / 127 : Math.min(1, Math.max(0, (state.transport.tempo - 40) / 240))
      return { label: KNOB_WORDS[knob.function] ?? knob.name, code: knob.short, value, unit, fraction }
    }),
    // Swap mode takes the knobs over whatever the page (`pageName` "Swap R1"): one tab says so.
    ...(state.surface.layer.type === 'swap'
      ? { pages: [], pageLabel: k.pageName }
      : { pages: KNOB_PAGES.map((p) => p.name), page: Math.max(0, KNOB_PAGES.findIndex((p) => p.id === k.page)) }),
  }
}

/** The Knob Assign pages, in the order `stepKnobPage` walks them (docs/app-api.md › Knob Assign pages). */
export const KNOB_PAGES: { id: KnobPage; name: string }[] = [
  { id: 'style', name: 'Style' },
  { id: 'rack', name: 'Rack' },
  { id: 'pan', name: 'Pan' },
  { id: 'reverb', name: 'Reverb' },
  { id: 'chorus', name: 'Chorus' },
  { id: 'delay', name: 'Delay' },
]

// ── Pads (kit › Pads, Pad; D11, D33) ──────────────────────────────────────────────────────

/** The Sections page, fixed (DECISIONS H3): caption, family, tooltip. */
const SECTION_PADS: { label: string; family: PadItem['family']; tip: string }[] = [
  { label: `Intro${NBSP}I`, family: 'intro', tip: 'section.intro1' },
  { label: `Intro${NBSP}II`, family: 'intro', tip: 'section.intro2' },
  { label: `Intro${NBSP}III`, family: 'intro', tip: 'section.intro3' },
  { label: 'Sync Start', family: 'util', tip: 'transport.sync_start' },
  { label: `Ending${NBSP}I`, family: 'ending', tip: 'section.ending1' },
  { label: `Ending${NBSP}II`, family: 'ending', tip: 'section.ending2' },
  { label: `Ending${NBSP}III`, family: 'ending', tip: 'section.ending3' },
  { label: 'Auto Fill', family: 'util', tip: 'transport.auto_fill' },
  { label: `Main${NBSP}A`, family: 'main', tip: 'section.main_a' },
  { label: `Main${NBSP}B`, family: 'main', tip: 'section.main_b' },
  { label: `Main${NBSP}C`, family: 'main', tip: 'section.main_c' },
  { label: `Main${NBSP}D`, family: 'main', tip: 'section.main_d' },
  { label: 'Break', family: 'brk', tip: 'section.break' },
  { label: 'Tap', family: 'util', tip: 'tempo.tap' },
  { label: 'Sync Stop', family: 'util', tip: 'transport.sync_stop' },
  { label: 'Start / Stop', family: 'start', tip: 'transport.start_stop' },
]

export const SECTION_LEGEND: LegendItem[] = [
  { label: 'Intro', hue: 'intro' },
  { label: 'Main', hue: 'main' },
  { label: 'Ending', hue: 'ending' },
  { label: 'Break', hue: 'brk' },
  { label: 'Fill', hue: 'fill' },
]

const FALLBACK_TIP: Record<PadPage, string> = {
  sections: 'launchkey.unused',
  racks: 'padpage.racks',
  chord: 'padpage.chord',
  multiPads: 'padpage.multi_pads',
  setup: 'padpage.setup',
}

/** Each pad bank tab's tooltip. */
const BANK_TIP: Record<PadPage, string> = { ...FALLBACK_TIP, sections: 'padpage.sections' }

/** A pad's face from its lamp (kit › Pad): off = absent, dim = idle, bright solid = playing,
 * flashing = next, pulsing = armed (a pulsing Main is the landing: next, D11). */
export function padFace(pad: Pick<Pad, 'level' | 'anim' | 'action'>, family: PadItem['family']): PadItem['state'] {
  if (pad.level === 'off' || pad.action === null) return 'dark'
  if (pad.level === 'dim') return 'idle'
  if (pad.anim === 'flash') return 'next'
  if (pad.anim === 'pulse') return family === 'main' ? 'next' : 'armed'
  return 'playing'
}

const WORDS: Partial<Record<PadItem['state'], string>> = { playing: ', playing', next: ', queued', armed: ', armed', dark: ' (not in this style)' }
const plain = (label: string) => label.replaceAll(NBSP, ' ')

export function pads(input: Pick<StageInput, 'state' | 'beats'>): StageProps['pads'] {
  const { state } = input
  const p = state.pads
  const sections = p.page === 'sections'
  const items = Array.from({ length: 16 }, (_, i): PadItem => {
    const pad = p.pads[i]
    if (sections) {
      const s = SECTION_PADS[i]
      if (s.family === 'start') {
        const running = state.transport.running
        return { ...s, state: running ? 'running' : 'idle', name: `Start / Stop (pad 16), ${running ? 'running' : 'stopped'}` }
      }
      const face = pad ? padFace(pad, s.family) : 'dark'
      const word = WORDS[face]
      return { ...s, state: face, name: word ? `${plain(s.label)} (pad ${i + 1})${word}` : undefined }
    }
    // Other pages until their spec lands (D33): utility pads captioned as the state sends.
    const label = pad?.label ?? ''
    if (!pad || label === '') return { label: '', family: 'util', state: 'dark', tip: 'launchkey.unused', name: `Pad ${i + 1} unused` }
    const face = padFace(pad, 'util')
    const word = face === 'dark' ? '' : (WORDS[face] ?? '')
    return { label, family: 'util', state: face, tip: FALLBACK_TIP[p.page], name: `${label} (pad ${i + 1})${word}` }
  })
  return {
    pads: items,
    // The page order Pad Bank ▲/▼ walk (Sections, then `settings.padPages`), one tab each.
    banks: p.pages.map((x) => x.name),
    bank: Math.max(0, p.pages.findIndex((x) => x.page === p.page)),
    bankTips: p.pages.map((x) => BANK_TIP[x.page]),
    bankName: p.pageName,
    legend: sections ? SECTION_LEGEND : [],
    // Queued pads flash on the LED clock, as the hardware's do.
    lit: input.beats - Math.floor(input.beats) < 0.5,
  }
}

// ── Status line, keys ─────────────────────────────────────────────────────────────────────

export function status(state: AppState, hint: StatusHint | null = null): StageProps['status'] {
  const m = state.message
  return { hint, text: m?.text ?? null, error: m?.error ?? false, seq: m?.seq ?? 0 }
}

/** What the status line shows in help mode while no control is hovered or focused. */
export const HELP_IDLE: StatusHint = {
  title: 'Help mode',
  body: 'Hover over or tab to any control: its entry stays here while you try it. Press ? again to leave help mode.',
  keys: '?',
}

/**
 * The tooltip the status line shows in its message's place (the old help footer's job):
 * the hovered or focused control's catalog entry (`tips.shown`), or in help mode with
 * nothing shown, how help mode works. `since` is the message `seq` when that control took
 * over: an error that arrives after it wins until the pointer moves to another control
 * (Decision: errors aren't hidden behind a hover). The status line's own button shows no
 * hint, since the hint would cover the message it explains.
 */
export function statusHint(input: {
  key: TipKey | null
  help: boolean
  message: AppState['message']
  since: number
}): StatusHint | null {
  const { key, help, message, since } = input
  if (key === 'display.status') return null
  if (message?.error && message.seq > since) return null
  if (!key) return help ? HELP_IDLE : null
  const t = TIPS[key]
  const keys = (t.app_keys ?? t.keys).map(keyLabel)
  const places = t.launchkey ? t.launchkey.split('; ') : []
  return {
    title: t.title,
    body: t.body,
    keys: keys.length ? keys.join(' / ') : null,
    launchkey: places.length ? places[0] + (places.length > 1 ? ` (+${places.length - 1} more)` : '') : null,
  }
}

const RIGHT_HUES = ['r1', 'r2', 'r3'] as const

export function keys(state: AppState, range: KeyRange): StageProps['keys'] {
  const [low, high] = RANGES[range]
  const held: HeldNote[] = state.keyboard.held
  const right = held.filter((h) => h.zone === 'right')
  const part = right.flatMap((h) => h.parts).find((n) => n >= 0 && n < 3)
  return {
    range: { low, high },
    split: state.keyboard.leftSplit,
    heldLeft: held.filter((h) => h.zone === 'left').map((h) => h.note),
    heldRight: right.map((h) => h.note),
    rightPart: part === undefined ? 'r1' : RIGHT_HUES[part],
  }
}
