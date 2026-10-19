// The Rack page's model: AppState turned into the props of ui/Rack and ui/RackMapEditor. Pure
// functions; they only word the engine's state for the screen.

import { defaultControlMap, type AppState, type ControlTarget, type KeyboardPart, type LibraryList } from '../../lib/api/types'
import type { RackHand, RackHead, RackKeyboard, RackMapSummary, RackNow, RackOneTouch, RackSend } from '../../ui/Rack/types'
import type { MapControl, MapHue, MapOption, MapPart, MapRow } from '../../ui/RackMapEditor/types'
import { instrumentName } from '../sounds/model'
import { display } from '../stage/model'
import { PART_NAMES, rackName, soundName, targetKey } from './rack'
import { STYLE_SEND_ROLES, STYLE_SENDS } from './strip'

const PART_SHORT = ['R1', 'R2', 'R3', 'L']
const PART_HUES = ['r1', 'r2', 'r3', 'l'] as const
const BANKS = 'ABCDEFGH'

const panText = (v: number) => (v === 64 ? 'C' : v < 64 ? `L${64 - v}` : `R${v - 64}`)

export function rackNow(state: AppState, library: LibraryList): RackNow {
  const n = display({ state, library, pos: 0 }).nowPlaying
  return {
    style: state.style.name,
    bpm: n.bpm,
    running: n.running ?? false,
    chord: n.chord?.chord ?? '',
    extension: n.chord?.extension ?? '',
    notes: (n.chord?.notes ?? []).map((x) => x.note).join(' '),
    section: n.playing,
    hue: n.hue ?? 'main',
  }
}

/** The Quick Rack the live rack is on, of the bank on view ("A1"); empty when none. */
export function quickRackName(state: AppState): string {
  const q = state.quickRacks
  const i = q.buttons.findIndex((b) => b.loaded)
  return i < 0 ? '' : `${BANKS[q.bank] ?? '?'}${i + 1}`
}

export function rackKeyboard(state: AppState): RackKeyboard {
  const c = state.chord
  return {
    split: c.splitName,
    transpose: c.transposeKeyboard,
    harmonyOn: state.harmonyArp.on,
    harmonyType: state.harmonyArp.typeName,
    manualBass: c.manualBassActive,
    manualBassEnabled: c.upper,
    leftHold: c.leftHold,
    quickRack: quickRackName(state),
    store: state.quickRacks.store,
  }
}

export function rackHead(state: AppState): RackHead {
  const r = state.liveRack
  return {
    name: rackName(r),
    mine: r.id !== null,
    modified: r.modified,
    canSave: r.modified || r.id === null,
    canRevert: r.modified && r.id !== null,
    saveAsName: r.id === null ? rackName(r) : `${r.name} copy`,
  }
}

/** The sound's number in the library: the patch `saved:<id>` names. */
function soundNumber(state: AppState, p: KeyboardPart): string {
  const id = p.sound?.id
  if (!id?.startsWith('saved:')) return ''
  const patch = state.soundLibrary.patches.find((x) => x.id === id.slice('saved:'.length))
  return patch ? String(patch.number) : ''
}

export function rackHands(state: AppState): RackHand[] {
  const ctx = { patches: state.soundLibrary.patches, gmMap: state.soundLibrary.gmMap ?? [] }
  const added = state.effects.sends.filter((s) => s.send >= STYLE_SENDS)
  return state.keyboardParts.slice(0, 4).map((p, i) => {
    const strip = p.strip
    const levels = added.map((s) => String(strip.sends[s.send] ?? 0))
    const sends = [...levels, ...(levels.length < 3 ? ['—'] : [])].join(' · ')
    const ins = strip.inserts[0]
    const entry = p.plugin ? state.plugins.list.find((x) => x.id === p.plugin!.id) : undefined
    const missing = p.plugin?.missing === true
    return {
      tag: PART_SHORT[i],
      name: PART_NAMES[i],
      hue: PART_HUES[i],
      number: soundNumber(state, p),
      sound: soundName(p),
      instrument: instrumentName(p, ctx, state.plugins.list, state.io.soundFontFile),
      edited: p.soundEdited === true,
      missing,
      on: p.sounding,
      onWord: p.playsBass ? 'Bass' : 'On',
      level: p.volume,
      pan: p.pan,
      reverb: p.reverb,
      chorus: p.chorus,
      delay: strip.sends[2] ?? p.variation,
      sends,
      sendsAria: `${PART_NAMES[i]} sends 4 to 6: ${added.length ? added.map((s) => `send ${s.send + 1} (${s.name}) ${strip.sends[s.send] ?? 0}`).join(', ') : 'none added'}. Opens the part's Channel`,
      octave: p.octave,
      insert: ins && ins.kind !== 'none' ? ins.name : 'None',
      insertAmount: ins && ins.kind !== 'none' ? (ins.settings[0]?.display ?? '') : '',
      plugin: !p.plugin ? 'none' : missing ? 'missing' : 'plugin',
      canEdit: !!p.plugin?.editor,
      pluginName: p.plugin?.name ?? '',
      inProcess: entry?.inProcess ?? !p.plugin?.outOfProcess,
      canInProcess: entry?.canRunInProcess ?? false,
    }
  })
}

// ── The controller map ────────────────────────────────────────────────────────────────────

/** A target in the map's words, without its part: "Level", "Rotary fast/slow", "Nothing". */
export function targetWord(state: AppState, t: ControlTarget | undefined): string {
  if (!t) return 'Nothing'
  const strip = 'part' in t ? state.keyboardParts[t.part]?.strip : undefined
  switch (t.kind) {
    case 'none':
      return 'Nothing'
    case 'partLevel':
      return 'Level'
    case 'partPan':
      return 'Pan'
    case 'partReverb':
      return 'Reverb'
    case 'partChorus':
      return 'Chorus'
    case 'partDelay':
      return 'Delay'
    case 'partSend': {
      const s = state.effects.sends.find((x) => x.send === t.send)
      return `Send ${t.send + 1}${s ? ` · ${s.name}` : ''}`
    }
    case 'partInsertOn':
      return `${strip?.inserts[t.slot]?.name ?? `Insert ${t.slot + 1}`} on`
    case 'partInsertSetting': {
      const ins = strip?.inserts[t.slot]
      return `${ins?.name ?? `Insert ${t.slot + 1}`} · ${ins?.settings[t.setting]?.name ?? `Setting ${t.setting + 1}`}`
    }
    case 'rotaryFast':
      return 'Rotary fast/slow'
    case 'harmonyArp':
      return 'Harmony/Arp on'
    case 'splitPoint':
      return 'Split point'
    case 'harmonyVolume':
      return 'Harmony volume'
    case 'metronomeVolume':
      return 'Metronome volume'
    case 'tempo':
      return 'Tempo'
    default:
      return 'Set by a newer yahaha'
  }
}

/** A target's live value as the editor shows it: "90", "C", "Fast", "On"; empty for none. */
export function targetValue(state: AppState, t: ControlTarget | undefined): string {
  if (!t) return ''
  const p = 'part' in t ? state.keyboardParts[t.part] : undefined
  switch (t.kind) {
    case 'partLevel':
      return p ? String(p.volume) : ''
    case 'partPan':
      return p ? panText(p.pan) : ''
    case 'partReverb':
      return p ? String(p.reverb) : ''
    case 'partChorus':
      return p ? String(p.chorus) : ''
    case 'partDelay':
      return p ? String(p.strip.sends[2] ?? p.variation) : ''
    case 'partSend':
      return p ? String(p.strip.sends[t.send] ?? 0) : ''
    case 'partInsertOn':
      return p?.strip.inserts[t.slot]?.on ? 'On' : 'Off'
    case 'partInsertSetting':
      return p?.strip.inserts[t.slot]?.settings[t.setting]?.display ?? ''
    case 'rotaryFast':
      return state.effects.rotaryFast ? 'Fast' : 'Slow'
    case 'harmonyArp':
      return state.harmonyArp.on ? 'On' : 'Off'
    case 'splitPoint':
      return state.chord.splitName
    case 'harmonyVolume':
      return String(state.harmonyArp.volume)
    case 'metronomeVolume':
      return String(state.metronome.volume)
    case 'tempo':
      return String(Math.round(state.transport.tempo))
    default:
      return ''
  }
}

function mapRow(state: AppState, control: MapControl, index: number, t: ControlTarget | undefined, def: ControlTarget | undefined): MapRow {
  const part = t && 'part' in t ? t.part : -1
  const name = `${control === 'fader' ? 'Fader' : 'Knob'} ${index + 1}`
  const word = targetWord(state, t)
  const changed = targetKey(t) !== targetKey(def)
  const whole = part >= 0 ? `${PART_NAMES[part]} ${word.toLowerCase()}` : word
  return {
    control,
    index,
    name,
    tag: part >= 0 ? PART_SHORT[part] : '',
    hue: (part >= 0 ? PART_HUES[part] : 't') as MapHue,
    target: word,
    key: targetKey(t),
    value: targetValue(state, t),
    dim: part >= 0 && !state.keyboardParts[part]?.sounding,
    changed,
    aria: `${name} target: ${whole}${changed ? ', changed from the default' : ''}. Change`,
  }
}

export function mapRows(state: AppState): { faders: MapRow[]; knobs: MapRow[] } {
  const c = state.liveRack.controls
  const d = defaultControlMap()
  return {
    faders: [0, 1, 2, 3].map((i) => mapRow(state, 'fader', i, c.faders[i], d.faders[i])),
    knobs: [0, 1, 2, 3, 4, 5, 6, 7].map((i) => mapRow(state, 'knob', i, c.knobs[i], d.knobs[i])),
  }
}

/** The map differs from the default. */
export function mapEdited(state: AppState): boolean {
  const c = state.liveRack.controls
  const d = defaultControlMap()
  return d.faders.some((t, i) => targetKey(t) !== targetKey(c.faders[i])) || d.knobs.some((t, i) => targetKey(t) !== targetKey(c.knobs[i]))
}

const RACK_TARGETS: ControlTarget[] = [
  { kind: 'none' },
  { kind: 'harmonyArp' },
  { kind: 'rotaryFast' },
  { kind: 'splitPoint' },
  { kind: 'harmonyVolume' },
  { kind: 'metronomeVolume' },
  { kind: 'tempo' },
]

/** A part's targets: level, pan, its sends (1-3 and each added one) and its inserts' on/off and settings. */
export function partTargets(state: AppState, part: number): ControlTarget[] {
  const strip = state.keyboardParts[part]?.strip
  const added = state.effects.sends.filter((s) => s.send >= STYLE_SENDS)
  return [
    { kind: 'partLevel', part },
    { kind: 'partPan', part },
    { kind: 'partReverb', part },
    { kind: 'partChorus', part },
    { kind: 'partDelay', part },
    ...added.map((s): ControlTarget => ({ kind: 'partSend', part, send: s.send })),
    ...(strip?.inserts ?? []).flatMap((ins, slot): ControlTarget[] =>
      ins.kind === 'none' ? [] : [{ kind: 'partInsertOn', part, slot }, ...ins.settings.map((_, setting): ControlTarget => ({ kind: 'partInsertSetting', part, slot, setting }))],
    ),
  ]
}

/** Every target the picker offers, by key: what a pick sends. */
export function targetsByKey(state: AppState): Map<string, ControlTarget> {
  const all = [...RACK_TARGETS, ...[0, 1, 2, 3].flatMap((p) => partTargets(state, p))]
  return new Map(all.map((t) => [targetKey(t), t]))
}

export function pickerOptions(state: AppState): { rack: MapOption[]; parts: MapPart[] } {
  return {
    rack: RACK_TARGETS.map((t) => ({ key: targetKey(t), label: targetWord(state, t), knobsOnly: t.kind === 'tempo' })),
    parts: [0, 1, 2, 3].map((part) => ({
      tag: PART_SHORT[part],
      name: PART_NAMES[part],
      hue: PART_HUES[part],
      sound: state.keyboardParts[part] ? soundName(state.keyboardParts[part]) : '',
      options: partTargets(state, part).map((t) => {
        const label = targetWord(state, t)
        return { key: targetKey(t), label, name: `${PART_NAMES[part]} ${label.toLowerCase()}` }
      }),
    })),
  }
}

export function rackMapSummary(state: AppState): RackMapSummary {
  const c = state.liveRack.controls
  const words = (ts: ControlTarget[]) =>
    ts.map((t) => (t && 'part' in t ? `${PART_SHORT[t.part]} ${targetWord(state, t).toLowerCase()}` : t?.kind === 'none' ? '—' : targetWord(state, t))).join(' · ')
  return { edited: mapEdited(state), faders: words(c.faders), knobs: words(c.knobs) }
}

/** What "Default map" sends: a setRackControl for each controller off its default target. */
export function defaultMapCommands(state: AppState): { control: MapControl; index: number; target: ControlTarget }[] {
  const c = state.liveRack.controls
  const d = defaultControlMap()
  return [
    ...d.faders.flatMap((t, index) => (targetKey(t) === targetKey(c.faders[index]) ? [] : [{ control: 'fader' as const, index, target: t }])),
    ...d.knobs.flatMap((t, index) => (targetKey(t) === targetKey(c.knobs[index]) ? [] : [{ control: 'knob' as const, index, target: t }])),
  ]
}

// ── Send effects and One Touch ────────────────────────────────────────────────────────────

export function rackSends(state: AppState): RackSend[] {
  return state.effects.sends.map((s) =>
    s.send < STYLE_SENDS
      ? { send: s.send, role: STYLE_SEND_ROLES[s.send] ?? s.name, note: s.setByRack ? s.name : 'from style', keep: s.setByRack }
      : { send: s.send, role: s.name, note: 'added', keep: false },
  )
}

export function rackOneTouch(state: AppState): RackOneTouch {
  const o = state.ots
  return {
    style: state.style.name,
    slots: [0, 1, 2, 3].map((i) => {
      const r = o.racks[i]
      return { name: o.settings[i]?.name ?? `OTS ${i + 1}`, rack: r && r.rack !== null && !r.missing ? r.name : '' }
    }),
    applied: o.applied,
    link: o.link,
    timing: o.linkTiming,
  }
}
