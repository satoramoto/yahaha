// The Channel page's wiring model (docs/specs/push/Channel.md): pure functions from the app's
// state to the library's `ChannelData` (app/src/ui/Channel/types.ts), and from each
// `ChannelChange` the page reports to the command it sends. Parts 0–3 are the keyboard parts
// (Right 1, Right 2, Right 3, Left), 4–11 the Style parts (`mixer.styleParts[part − 4]`), as
// the strips number them.
//
// A part number out of range wraps into 0–11 (a non-integer reads as 0), and a part whose data
// the state lacks reads as that part of a fresh state (`emptyState()`): the page never throws.

import { emptyState } from '../../lib/api/constants'
import type { AppCmd, AppState, KeyboardPart, Meters, StripState, StylePart } from '../../lib/api/types'
import { MAX_SENDS, SEND_KINDS } from '../effects/sendKinds'
import { inMySounds } from '../sounds/instruments'
import type { ChannelChange, ChannelData, ChannelInsert, ChannelSendRow, ChannelSound, ChannelTab, PartEntry, PartHue, PluginLine } from '../../ui/Channel/types'
import { INSERT_KINDS, STRIP_COUNT } from './channel'

/** The keyboard parts' tags, parts 0–3. */
export const PART_TAGS = ['R1', 'R2', 'R3', 'L']
/** The keyboard parts' hues, parts 0–3. */
export const PART_HUES: PartHue[] = ['r1', 'r2', 'r3', 'l']
/** How many keyboard parts lead the twelve. */
export const KEYBOARD_PARTS = 4
/** The send buses' labels, sends 1–3. */
export const BUS_LABELS = ['Reverb', 'Chorus', 'Delay']

/** Octave and Bend range limits (the steppers' ends). */
export const OCTAVE_MIN = -2
export const OCTAVE_MAX = 2
export const BEND_MIN = 0
export const BEND_MAX = 12

/** A part number as 0–11: wraps out-of-range numbers, a non-integer reads as 0. */
export function normPart(part: number): number {
  if (!Number.isInteger(part)) return 0
  return ((part % STRIP_COUNT) + STRIP_COUNT) % STRIP_COUNT
}

let blank: AppState | null = null
const fresh = () => (blank ??= emptyState())

/** Keyboard part `i` (0–3), or a fresh state's when the state lacks it. */
function keyboardPart(state: AppState, i: number): KeyboardPart {
  return state.keyboardParts[i] ?? fresh().keyboardParts[i]
}

/** Style part `p` (0–7), or a fresh state's when the state lacks it. */
function stylePart(state: AppState, p: number): StylePart {
  return state.mixer.styleParts[p] ?? fresh().mixer.styleParts[p]
}

/** Is keyboard part `part`'s swap held (`surface.layer`)? */
export function swapHeld(state: AppState, part: number): boolean {
  const l = state.surface?.layer
  return l?.type === 'swap' && l.part === part
}

/** A part's tag in the parts list: "R1" … "L", then the Style part's name. */
function tagOf(state: AppState, part: number): string {
  return part < KEYBOARD_PARTS ? PART_TAGS[part] : stylePart(state, part - KEYBOARD_PARTS).name
}

/** The twelve parts-list entries. */
export function partEntries(state: AppState): PartEntry[] {
  return Array.from({ length: STRIP_COUNT }, (_, i) => {
    if (i < KEYBOARD_PARTS) {
      const p = keyboardPart(state, i)
      // `sounding` already counts Left playing the bass under Manual Bass.
      return { tag: PART_TAGS[i], name: p.sound?.name ?? p.voiceName, hue: PART_HUES[i], off: !p.sounding }
    }
    const s = stylePart(state, i - KEYBOARD_PARTS)
    return { tag: s.name, name: '', hue: null, off: !s.on }
  })
}

/** The sound's number in the library: the patch `saved:<id>` names (Stage.md › Sounds row). */
function soundNumber(state: AppState, part: KeyboardPart): string {
  const id = part.sound?.id
  if (!id?.startsWith('saved:')) return ''
  const patch = state.soundLibrary?.patches.find((p) => p.id === id.slice('saved:'.length))
  return patch ? String(patch.number) : ''
}

function pluginLine(part: KeyboardPart): PluginLine | null {
  const p = part.plugin
  if (!p) return null
  return { name: p.name, status: p.status, missing: p.missing === true, inProcess: !p.outOfProcess, fallback: p.inProcessFallback === true, editor: p.editor === true }
}

function keyboardSound(state: AppState, part: KeyboardPart): ChannelSound {
  const id = part.sound?.id ?? ''
  return {
    number: soundNumber(state, part),
    name: part.sound?.name ?? part.voiceName,
    edited: part.soundEdited === true,
    missing: part.plugin?.missing === true,
    failed: part.plugin?.status === 'failed' && part.plugin.missing !== true,
    // A part silenced by another's solo is on: no "off".
    off: !part.on && !part.sounding,
    bass: part.playsBass,
    mine: id.startsWith('saved:') || (id !== '' && inMySounds(state.soundLibrary?.patches ?? [], id)),
    plugin: pluginLine(part),
  }
}

function styleSound(part: StylePart): ChannelSound {
  return { number: '', name: part.voice?.label ?? '', edited: false, missing: false, failed: false, off: !part.on, bass: false, mine: false, plugin: null }
}

/** The six send rows: a send is there when `effects.sends` has an entry with its `send`. */
function sendRows(state: AppState, strip: StripState): ChannelSendRow[] {
  return Array.from({ length: MAX_SENDS }, (_, i) => {
    const entry = state.effects.sends.find((s) => s.send === i)
    const label = i < BUS_LABELS.length ? BUS_LABELS[i] : (entry?.name ?? `Send ${i + 1}`)
    return { send: i, label, level: entry ? (strip.sends[i] ?? 0) : 0, present: entry !== undefined }
  })
}

function inserts(strip: StripState): ChannelInsert[] {
  return strip.inserts.map((s) => ({
    kind: s.kind,
    name: s.name,
    on: s.on,
    settings: s.settings.map((x) => ({ name: x.name, value: x.value, min: x.min, max: x.max, default: x.default, display: x.display })),
  }))
}

/** The MIDI channel's CPU share (0–1); null with no meters or no such channel (no synth). */
function cpuOf(meters: Meters | null, channel: number): number | null {
  return meters?.channels.find((c) => c.channel === channel)?.cpu ?? null
}

export interface ChannelInput {
  state: AppState
  /** The latest meters frame; null: no CPU reading. */
  meters: Meters | null
  /** The open part, 0–11 (`ui.selectedPart`). */
  part: number
  tab: ChannelTab
}

/** Everything the Channel page shows for the open part. */
export function channelData(input: ChannelInput): ChannelData {
  const { state, meters, tab } = input
  const part = normPart(input.part)
  const keyboard = part < KEYBOARD_PARTS
  const kp = keyboard ? keyboardPart(state, part) : null
  const sp = keyboard ? null : stylePart(state, part - KEYBOARD_PARTS)
  const strip = (kp ?? sp)!.strip
  const common = {
    part,
    parts: partEntries(state),
    keyboard,
    tab,
    prevTag: tagOf(state, (part + STRIP_COUNT - 1) % STRIP_COUNT),
    nextTag: tagOf(state, (part + 1) % STRIP_COUNT),
    sends: sendRows(state, strip),
    sendKinds: state.effects.sends.length < MAX_SENDS ? SEND_KINDS.map((k) => ({ kind: k.kind, name: k.name })) : [],
    eq: { lowGain: strip.eq.lowGain, lowFreq: strip.eq.lowFreq, highGain: strip.eq.highGain, highFreq: strip.eq.highFreq },
    comp: { ...strip.comp },
    inserts: inserts(strip),
    insertKinds: INSERT_KINDS.map((k) => ({ kind: k.kind, name: k.name })),
    rotaryFast: state.effects.rotaryFast,
  }
  if (kp) {
    const held = swapHeld(state, part)
    return {
      ...common,
      partName: kp.name,
      hue: PART_HUES[part],
      cpu: cpuOf(meters, kp.channel),
      sound: keyboardSound(state, kp),
      mix: {
        level: kp.volume,
        waiting: kp.waiting,
        pan: kp.pan,
        on: kp.sounding,
        onLabel: held ? 'Swap' : kp.on ? 'On' : 'Off',
        canSwap: true,
        solo: state.mixer.partSolo === part,
      },
      tone: { ...strip.tone },
      play: {
        mono: strip.mono,
        portamento: { on: strip.portamento.on, time: strip.portamento.time },
        octave: kp.octave,
        bend: state.controllers?.parts[part]?.bendRange ?? null,
      },
    }
  }
  const p = part - KEYBOARD_PARTS
  const s = sp!
  return {
    ...common,
    partName: s.name,
    hue: null,
    cpu: cpuOf(meters, s.channel),
    sound: styleSound(s),
    mix: { level: s.volume, waiting: s.waiting, pan: null, on: s.on, onLabel: s.on ? 'On' : 'Off', canSwap: false, solo: state.mixer.styleSolo === p },
    tone: null,
    play: null,
  }
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

/** The command a change on the Channel page sends; null when it sends nothing (a Style part's
 * pan, tone and play rows, a missing send, an unchanged insert kind, a stepper at its end). */
export function channelCommand(state: AppState, part: number, change: ChannelChange): AppCmd | null {
  part = normPart(part)
  const keyboard = part < KEYBOARD_PARTS
  const p = part - KEYBOARD_PARTS
  const strip = keyboard ? keyboardPart(state, part).strip : stylePart(state, p).strip
  switch (change.type) {
    case 'level':
      return keyboard ? { type: 'setPartVolume', part, volume: change.value } : { type: 'setStylePartVolume', part: p, volume: change.value }
    case 'pan':
      return keyboard ? { type: 'setPartPan', part, pan: change.value } : null
    case 'on':
      if (!keyboard) return { type: 'toggleStylePart', part: p }
      return swapHeld(state, part) ? { type: 'setLayer', layer: { type: 'none' } } : { type: 'togglePart', part }
    case 'swap':
      return keyboard ? { type: 'setLayer', layer: { type: 'swap', part } } : null
    case 'solo':
      if (keyboard) return { type: 'setPartSolo', part: state.mixer.partSolo === part ? null : part }
      return { type: 'setStyleSolo', part: state.mixer.styleSolo === p ? null : p }
    case 'send':
      if (!state.effects.sends.some((s) => s.send === change.send)) return null
      return { type: 'setStripSend', strip: part, send: change.send, level: change.value }
    case 'addSend':
      return { type: 'addSend', kind: change.kind }
    case 'eq':
      return { type: 'setStripEq', strip: part, eq: { ...strip.eq, [change.field]: change.value } }
    case 'tone':
      return keyboard ? { type: 'setStripTone', strip: part, control: change.control, value: change.value } : null
    case 'mono':
      return keyboard ? { type: 'setStripMono', strip: part, on: !strip.mono } : null
    case 'portamento':
      return keyboard ? { type: 'setStripPortamento', strip: part, on: change.time > 0, time: change.time } : null
    case 'octave': {
      if (!keyboard) return null
      const o = keyboardPart(state, part).octave
      const next = clamp(o + change.step, OCTAVE_MIN, OCTAVE_MAX)
      return next === o ? null : { type: 'setPartOctave', part, octave: next }
    }
    case 'bend': {
      const b = keyboard ? state.controllers?.parts[part]?.bendRange : undefined
      if (b === undefined) return null
      const next = clamp(b + change.step, BEND_MIN, BEND_MAX)
      return next === b ? null : { type: 'setBendRange', part, semitones: next }
    }
    case 'compOn':
      return { type: 'setStripCompressorOn', strip: part, on: !strip.comp.on }
    case 'compPreset':
      return { type: 'setStripCompressorPreset', strip: part, preset: change.preset }
    case 'compParam':
      return { type: 'setStripCompressorParam', strip: part, param: change.param, value: change.value }
    case 'insertKind':
      if (strip.inserts[change.slot]?.kind === change.kind) return null
      return { type: 'setStripInsertKind', strip: part, slot: change.slot, kind: change.kind }
    case 'insertOn': {
      const slot = strip.inserts[change.slot]
      return slot ? { type: 'setStripInsertOn', strip: part, slot: change.slot, on: !slot.on } : null
    }
    case 'insertSetting':
      return { type: 'setStripInsertSetting', strip: part, slot: change.slot, setting: change.setting, value: change.value }
    case 'rotaryFast':
      return { type: 'toggleRotaryFast' }
  }
}
