// The Effects page's data and commands: pure functions from the app's state (and which bus is
// open) to the props of the library's `Effects` (app/src/ui/Effects), and from its changes to the
// commands they send. EffectsPage.svelte feeds these from the stores
// (docs/specs/push/Effects.md; where this differs from the spec, the PR's Decisions say why).

import { COMP_PRESETS, EQ_PRESETS, INSERT_EFFECTS, MASTER_EQ_FREQ_RANGE } from '../../lib/api/types'
import type {
  AppCmd,
  AppState,
  CompParam,
  CompPreset,
  EffectBlockState,
  EffectsState,
  EqPreset,
  FxBlock,
  FxParam,
  FxParamState,
  FxType,
  SendKind,
  SendState,
  SettingState,
} from '../../lib/api/types'
import type {
  BusChange,
  BusData,
  EffectsBus,
  EffectsData,
  EqBandData,
  InsertsChange,
  InsertsData,
  ListData,
  MasterChange,
  MasterData,
  MixChange,
  ParamRow,
  PartHue,
  PartSendItem,
  SendRowData,
  SwitchItem,
} from '../../ui/Effects/types'
import { MAX_SENDS, SEND_KINDS, STYLE_SENDS } from './sendKinds'

/** Sends 1–3 are these blocks. */
const BLOCKS: FxBlock[] = ['reverb', 'chorus', 'variation']
/** Sends 1–3 by their bus's name (the Variation block is the tempo delay). */
const BUS_NAMES = ['Reverb', 'Chorus', 'Delay']
const TYPE_TIPS: Record<FxBlock, string> = { reverb: 'fx.reverb_type', chorus: 'fx.chorus_type', variation: 'fx.variation_type' }
const LEVEL_TIPS: Record<FxBlock, { ret: string; band: string; pad: string }> = {
  reverb: { ret: 'fx.reverb_return', band: 'fx.reverb_band', pad: 'fx.reverb_pad' },
  chorus: { ret: 'fx.chorus_return', band: 'fx.chorus_band', pad: 'fx.chorus_pad' },
  variation: { ret: 'fx.variation_return', band: 'fx.variation_band', pad: 'fx.variation_pad' },
}
/** A block's band and pad sends' defaults (the API's: reverb 100, chorus and delay 0). */
const SEND_DEFAULTS: Record<FxBlock, number> = { reverb: 100, chorus: 0, variation: 0 }
/** Each block's knob page: its number of 6 and its name (src/knobs.rs `KnobPage::ALL`). */
const KNOB_PAGES: Record<FxBlock, [number, string]> = { reverb: [4, 'Reverb'], chorus: [5, 'Chorus'], variation: [6, 'Delay'] }

const PART_TAGS = ['R1', 'R2', 'R3', 'L']
const PART_HUES: PartHue[] = ['r1', 'r2', 'r3', 'l']

/** The XG EQ frequency steps, 32 Hz to 16 kHz (the Master EQ's bands take these). */
const EQ_STEPS = [
  32, 36, 40, 45, 50, 56, 63, 70, 80, 90, 100, 110, 125, 140, 160, 180, 200, 225, 250, 280, 315, 355, 400, 450, 500, 560, 630, 700, 800, 900, 1000,
  1100, 1200, 1400, 1600, 1800, 2000, 2200, 2500, 2800, 3200, 3600, 4000, 4500, 5000, 5600, 6300, 7000, 8000, 9000, 10000, 11000, 12000, 14000, 16000,
]

/** "param_name" for a camelCase parameter id: `reverbTime` → `reverb_time`. */
const snake = (id: string) => id.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)

/** A type's short label: the delay's types without the bus name ("Delay 1/8." → "Dotted 1/8"). */
export function typeLabel(name: string): string {
  if (name === 'Delay 1/8.') return 'Dotted 1/8'
  if (name.startsWith('Delay ')) return name.slice(6)
  if (name === 'Ping-Pong') return 'Ping-pong'
  return name
}

/** What the editor shows: `bus` when it names a send that's there (or the Master or the inserts), else send 1. */
export function shownBus(bus: EffectsBus, rows: number): EffectsBus {
  if (bus === 'master' || bus === 'inserts') return bus
  return Number.isInteger(bus) && bus >= 0 && bus < rows ? bus : 0
}

/** "4, 5 and 6 free", "6 free". */
export function freeText(sends: number[]): string {
  const free = [3, 4, 5].filter((s) => !sends.includes(s)).map((s) => String(s + 1))
  if (free.length === 0) return ''
  const list = free.length === 1 ? free[0] : `${free.slice(0, -1).join(', ')} and ${free[free.length - 1]}`
  return `${list} free`
}

/** The sends the list draws: the state's, or (an older state without them) the three blocks. */
function sendsOf(fx: EffectsState): SendState[] {
  if (fx.sends && fx.sends.length > 0) return fx.sends
  return fx.blocks.map((b, send) => ({
    send,
    kind: b.effect as SendKind,
    name: b.effectName,
    params: b.params,
    returnLevel: b.returnLevel,
    fromStyle: true,
    setByRack: false,
  }))
}

const blockOf = (fx: EffectsState, send: number): EffectBlockState | undefined => (send < STYLE_SENDS ? fx.blocks.find((b) => b.block === BLOCKS[send]) : undefined)

function sendRow(fx: EffectsState, s: SendState): SendRowData {
  const block = blockOf(fx, s.send)
  if (block) {
    return {
      send: s.send,
      name: BUS_NAMES[s.send],
      subtitle: `${typeLabel(block.effectName)} · ${block.followStyle ? 'From style' : 'Mine'}`,
      returnLevel: block.returnLevel,
      setByRack: s.setByRack,
    }
  }
  return { send: s.send, name: s.name, subtitle: 'Added send', returnLevel: s.returnLevel, setByRack: false }
}

const KNOWN_PRESET = <T extends { name: string }>(list: T[], pick: (x: T) => boolean, fallback: string) => list.find(pick)?.name ?? fallback

export function listData(state: AppState): ListData {
  const fx = state.effects
  const sends = sendsOf(fx)
  const hasSends = (fx.sends?.length ?? 0) > 0
  const master = fx.master
  const comp = master?.compressor
  const eq = master?.eq
  const compName = KNOWN_PRESET(COMP_PRESETS, (p) => p.preset === comp?.preset, 'Natural')
  const eqName = KNOWN_PRESET(EQ_PRESETS, (p) => p.preset === eq?.preset, 'Flat')
  const names = fx.inserts.map((i) => i.partName).join(', ')
  return {
    sends: sends.map((s) => sendRow(fx, s)),
    canAdd: hasSends && sends.length < MAX_SENDS,
    free: freeText(sends.map((s) => s.send)),
    insertsLine: fx.inserts.length === 0 ? 'None in this style' : `${fx.insertsOn ? 'On' : 'Off'} · ${names}`,
    masterLine: `Comp ${comp?.on ? compName : 'off'} · EQ ${eq?.on ? eqName : 'off'}`,
  }
}

const isSwitch = (p: { min: number; max: number }) => p.min === 0 && p.max === 1

/** A Readout row from a block parameter or a send's setting. */
function paramRow(id: string, p: FxParamState | SettingState, code: string, tip: string): ParamRow {
  return { id, label: p.name, value: p.value, min: p.min, max: p.max, defaultValue: p.default, display: p.display, code, tip }
}

/**
 * The delay's Note and Time share one row: Note while tempo sync is on, Time while it's off.
 * Returns the names (or ids) to leave out, given whether sync is on.
 */
function hiddenByDelay(sync: number | undefined, note: string, time: string): string | null {
  if (sync === undefined) return null
  return sync === 1 ? time : note
}

function partSends(state: AppState, send: number): PartSendItem[] {
  return state.keyboardParts.slice(0, 4).map((p, part) => ({
    part,
    tag: PART_TAGS[part],
    hue: PART_HUES[part],
    name: p.name,
    value: p.strip?.sends?.[send] ?? 0,
    sounding: p.sounding,
  }))
}

function blockBus(state: AppState, block: EffectBlockState, s: SendState | undefined, send: number): BusData {
  const name = BUS_NAMES[send]
  const sync = block.params.find((p) => p.param === 'delaySync')?.value
  const hide = hiddenByDelay(sync, 'delayNote', 'delayTime')
  const switches: SwitchItem[] = block.params.filter(isSwitch).map((p) => ({
    id: p.param,
    label: p.name,
    on: p.value === 1,
    tip: `fx.param.${snake(p.param)}`,
  }))
  if (s) {
    switches.push({ id: 'rack', label: 'Keep with rack', on: s.setByRack, tip: 'fx.send_keep', name: `${name}: keep this type with the rack` })
  }
  const shown = block.params.filter((p) => !isSwitch(p) && p.param !== hide)
  const params = shown.map((p, i) => paramRow(p.param, p, `K${5 + i}`, `fx.param.${snake(p.param)}`))
  const tips = LEVEL_TIPS[block.block]
  const levels: ParamRow[] = [
    { id: 'return', label: 'Return', value: block.returnLevel, min: 0, max: 127, defaultValue: 64, display: String(block.returnLevel), code: 'K8', tip: tips.ret },
    { id: 'band', label: 'Band send', value: block.bandSend, min: 0, max: 127, defaultValue: SEND_DEFAULTS[block.block], display: `${block.bandSend}%`, code: '', tip: tips.band },
    { id: 'pad', label: 'Pad send', value: block.padSend, min: 0, max: 127, defaultValue: SEND_DEFAULTS[block.block], display: `${block.padSend}%`, code: '', tip: tips.pad },
  ]
  const [page, pageName] = KNOB_PAGES[block.block]
  const knobs = params.length >= 3 ? 'K1 to K8' : `K1 to K${4 + params.length} and K8`
  const style = block.styleEffect ? `Style: ${block.styleEffect.name}.` : 'The style sets none.'
  const rack = s?.setByRack ? `Set by rack: the rack keeps ${typeLabel(block.effectName)} when the style changes.` : 'Picking a type makes it Mine.'
  return {
    send,
    name,
    word: name.toLowerCase(),
    styleBus: true,
    followStyle: block.followStyle,
    types: block.types.map((t) => ({ id: t.effect, label: typeLabel(t.name), tip: TYPE_TIPS[block.block] })),
    type: block.effect,
    typeTip: TYPE_TIPS[block.block],
    switches,
    params,
    levels,
    parts: partSends(state, send),
    partsCode: 'K1–4',
    note: `${style} ${rack} Knob page ${page}/6, ${pageName}, moves ${knobs}.`,
  }
}

function addedBus(state: AppState, s: SendState): BusData {
  const names = s.params.map((p) => p.name)
  const isDelay = ['Tempo sync', 'Note', 'Time', 'Ping-pong'].every((n) => names.includes(n))
  const sync = isDelay ? s.params.find((p) => p.name === 'Tempo sync')?.value : undefined
  const hide = hiddenByDelay(sync, 'Note', 'Time')
  const switches: SwitchItem[] = []
  const params: ParamRow[] = []
  s.params.forEach((p, i) => {
    if (isSwitch(p)) switches.push({ id: `p${i}`, label: p.name, on: p.value === 1, tip: 'fx.send_param', name: `${s.name} ${p.name}` })
    else if (p.name !== hide) params.push(paramRow(`p${i}`, p, '', 'fx.send_param'))
  })
  const kinds = SEND_KINDS.some((k) => k.kind === s.kind) ? SEND_KINDS : [{ kind: s.kind, name: s.name }, ...SEND_KINDS]
  return {
    send: s.send,
    name: s.name,
    word: s.name.toLowerCase(),
    styleBus: false,
    followStyle: null,
    types: kinds.map((k) => ({ id: k.kind, label: k.name })),
    type: s.kind,
    typeTip: 'fx.send_kind',
    switches,
    params,
    levels: [{ id: 'return', label: 'Return', value: s.returnLevel, min: 0, max: 127, defaultValue: 64, display: String(s.returnLevel), code: '', tip: 'fx.send_return' }],
    parts: partSends(state, s.send),
    partsCode: '',
    note: 'Saved with the rack. No knob page moves it.',
  }
}

/** The open send's editor, or null when `bus` isn't a send. */
export function busData(state: AppState, bus: EffectsBus): BusData | null {
  if (typeof bus !== 'number') return null
  const fx = state.effects
  const s = sendsOf(fx).find((x) => x.send === bus)
  const block = blockOf(fx, bus)
  const hasSends = (fx.sends?.length ?? 0) > 0
  if (block) return blockBus(state, block, hasSends ? s : undefined, bus)
  return s ? addedBus(state, s) : null
}

/** "+1", "0", "−6". */
const db = (v: number) => (v > 0 ? `+${v}` : v < 0 ? `−${-v}` : '0')

export function masterData(state: AppState): MasterData {
  const m = state.effects.master
  const comp = m?.compressor ?? { on: false, preset: 'natural' as CompPreset, compression: 30, texture: 50, output: 1, edited: false }
  const eq = m?.eq ?? { on: false, preset: 'flat' as EqPreset, bands: [], edited: false }
  const bands: EqBandData[] = eq.bands.map((b, i) => {
    const [lo, hi] = MASTER_EQ_FREQ_RANGE[i] ?? [32, 16000]
    const steps = EQ_STEPS.filter((f) => f >= lo && f <= hi)
    return { gain: b.gain, freq: b.freq, freqSteps: steps.includes(b.freq) ? steps : [...steps, b.freq].sort((x, y) => x - y), q: b.q, shelf: b.shelf, canShelf: i === 0 || i === eq.bands.length - 1 }
  })
  const defaults = COMP_PRESETS.find((p) => p.preset === comp.preset)?.params ?? [30, 50, 1]
  return {
    compOn: comp.on,
    compType: comp.preset,
    compTypes: COMP_PRESETS.map((p) => ({ id: p.preset, label: p.name })),
    compEdited: comp.edited,
    comp: [
      { id: 'compression', label: 'Compression', value: comp.compression, min: 0, max: 100, defaultValue: defaults[0], display: `${comp.compression}%`, code: '', tip: 'fx.master_comp_compression' },
      { id: 'texture', label: 'Texture', value: comp.texture, min: 0, max: 100, defaultValue: defaults[1], display: `${comp.texture}%`, code: '', tip: 'fx.master_comp_texture' },
      { id: 'output', label: 'Output', value: comp.output, min: -12, max: 12, defaultValue: defaults[2], display: `${db(comp.output)} dB`, code: '', tip: 'fx.master_comp_output' },
    ],
    eqOn: eq.on,
    eqType: eq.preset,
    eqTypes: EQ_PRESETS.map((p) => ({ id: p.preset, label: p.name, tip: 'fx.master_eq_type' })),
    eqEdited: eq.edited,
    bands,
  }
}

export function insertsData(state: AppState): InsertsData {
  const fx = state.effects
  return {
    on: fx.insertsOn,
    rows: fx.inserts.map((i) => ({
      part: i.part,
      partName: i.partName,
      xgName: i.name,
      plays: i.effect ? (INSERT_EFFECTS.find((e) => e.effect === i.effect)?.name ?? i.effect) : 'Dry',
      playing: i.effect !== null,
      on: i.on,
      amount: i.amount,
    })),
  }
}

/** The whole page's data with `bus` asked for (`effectsNav.bus`). */
export function effectsData(state: AppState, bus: EffectsBus): EffectsData {
  const shown = shownBus(bus, sendsOf(state.effects).length)
  const m = state.effects.master
  return {
    bus: shown,
    list: listData(state),
    mix: { insertsOn: state.effects.insertsOn, rotaryFast: state.effects.rotaryFast, compOn: m?.compressor.on ?? false, eqOn: m?.eq.on ?? false },
    editor: busData(state, shown),
    master: masterData(state),
    inserts: insertsData(state),
  }
}

// ── Changes → commands ──────────────────────────────────────────────────────────────────────────

const paramIndex = (id: string) => (/^p\d+$/.test(id) ? Number(id.slice(1)) : null)

/** The command a send editor's change sends; null for one that sends nothing. */
export function busCommand(change: BusChange): AppCmd | null {
  const block = change.send < STYLE_SENDS ? BLOCKS[change.send] : null
  switch (change.type) {
    case 'source':
      return block ? { type: 'setFollowStyle', block, on: change.follow } : null
    case 'kind':
      return block ? { type: 'setEffectType', block, effect: change.kind as FxType } : { type: 'setSendKind', send: change.send, kind: change.kind as SendKind }
    case 'switch': {
      if (change.id === 'rack') return { type: 'setRackSendOverride', send: change.send, on: change.on }
      const i = paramIndex(change.id)
      if (i !== null) return { type: 'setSendParam', send: change.send, param: i, value: change.on ? 1 : 0 }
      return block ? { type: 'setEffectParam', block, param: change.id as FxParam, value: change.on ? 1 : 0 } : null
    }
    case 'param': {
      if (change.id === 'return') {
        return block ? { type: 'setEffectReturn', block, level: change.value } : { type: 'setSendReturn', send: change.send, level: change.value }
      }
      if (change.id === 'band') return block ? { type: 'setBandSend', block, level: change.value } : null
      if (change.id === 'pad') return block ? { type: 'setPadSend', block, level: change.value } : null
      const i = paramIndex(change.id)
      if (i !== null) return { type: 'setSendParam', send: change.send, param: i, value: change.value }
      return block ? { type: 'setEffectParam', block, param: change.id as FxParam, value: change.value } : null
    }
    case 'partSend':
      return { type: 'setStripSend', strip: change.part, send: change.send, level: change.value }
    case 'remove':
      return { type: 'removeSend', send: change.send }
  }
}

export function masterCommand(change: MasterChange): AppCmd {
  switch (change.type) {
    case 'compType':
      return { type: 'setMasterCompressorPreset', preset: change.preset as CompPreset }
    case 'compParam':
      return { type: 'setMasterCompressorParam', param: change.id as CompParam, value: change.value }
    case 'eqType':
      return { type: 'setMasterEqPreset', preset: change.preset as EqPreset }
    case 'eqBand':
      return { type: 'setMasterEqBand', band: change.band, gain: change.gain, freq: change.freq, q: change.q, shelf: change.shelf }
  }
}

export function insertsCommand(change: InsertsChange): AppCmd {
  return change.type === 'on'
    ? { type: 'setPartInsertOn', part: change.part, on: change.on }
    : { type: 'setPartInsertAmount', part: change.part, amount: change.amount }
}

export function mixCommand(change: MixChange): AppCmd {
  switch (change.type) {
    case 'insertsOn':
      return { type: 'setInsertsOn', on: change.on }
    case 'rotaryFast':
      return { type: 'toggleRotaryFast' }
    case 'compOn':
      return { type: 'setMasterCompressorOn', on: change.on }
    case 'eqOn':
      return { type: 'setMasterEqOn', on: change.on }
  }
}
