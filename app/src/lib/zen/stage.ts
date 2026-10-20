// The bridge to zen's Stage (`@satoramoto/zen/svelte`, the app's Stage): pure functions from the app's
// `AppState` (docs/app-api.md) to the props of zen's `Stage`, and from its callbacks back to
// `AppCmd`s. It reuses the app's own Stage model (panels/stage/model.ts, actions.ts), which
// draws the same regions for the app's UI library, and translates their shapes to zen's:
// camelCase callbacks, the section row's switches in the app bar, the transport as zen's song
// form, the parts as zen's hue slots (`yahaha/hues.ts`: r1 r2 r3 l → hue 1–4).
//
// Fields zen's Stage has and AppState lacks get a default, named where it is set (DEFAULTS).

import type { StageProps } from '@satoramoto/zen/svelte'
import type { AppCmd, AppState, LibraryList, Meters } from '../api/types'
import type { KeyRange } from '../store.svelte'
import { stageActions, type OpenTarget } from '../../panels/stage/actions'
import { appBar, display, faders, keys, knobs, pads, status, whenText } from '../../panels/stage/model'
import { keysActions } from '../../panels/stage/splitPick.svelte'
import type { StatusHint } from '../../ui/StatusLine/StatusLine.svelte'

/** zen's song form section ids, as its `SongForm` names them. */
type SectionId = NonNullable<StageProps['songForm']['playing']>
type PadItem = StageProps['pads']['pads'][number]

/** What the Stage reads besides the state; each has a default (DEFAULTS). */
export interface StageExtras {
  /** `app.library`: the style list (category, the queued style's name). */
  library: LibraryList
  /** The latest meters frame; null draws every meter empty. */
  meters: Meters | null
  /** Held peaks, strips 1–9, linear; a missing entry is 0. */
  holds: number[]
  /** The chosen page tab. */
  page: string
  /** Help mode (`tips.help`). */
  help: boolean
  /** The key strip's range. */
  keyRange: KeyRange
  /** Audio dropouts in the last 30 s. */
  dropouts: number
  /** The LED clock (`clock.beats`): queued pads flash on it. */
  beats: number
  /** Quarter notes into the section playing (`clock.pos`). */
  pos: number
  /** The metronome's settings popover is open. */
  metronomeOpen: boolean
  /** The hovered or focused control's tooltip, in the status line's place (panels/stage/hint.svelte.ts). */
  hint: StatusHint | null
  /** A split pick is armed on the keyboard (panels/stage/splitPick.svelte.ts). */
  picking: boolean
  /** The Shift layer held (`ui.shift`): the pads show their Shift faces. */
  shift: boolean
}

/** The defaults for what AppState doesn't carry: a still Stage, nothing measured, 61 keys. */
export const DEFAULTS: StageExtras = {
  library: { revision: 0, entries: [], voices: [], harmonyTypes: [], arpPatterns: [] },
  meters: null,
  holds: [],
  page: 'stage',
  help: false,
  keyRange: 61,
  dropouts: 0,
  beats: 0,
  pos: 0,
  metronomeOpen: false,
  hint: null,
  picking: false,
  shift: false,
}

const MAINS = ['mainA', 'mainB', 'mainC', 'mainD'] as const
const INTROS = ['intro1', 'intro2', 'intro3'] as const
const ENDINGS = ['ending1', 'ending2', 'ending3'] as const
const ABCD = 'ABCD'

/** zen's id for a section the engine names ("Main B" → mainB, "Intro A" → intro1, "Fill In BA" → break); null for any other fill. */
export function sectionId(name: string | null): SectionId | null {
  if (!name) return null
  if (name === 'Fill In BA') return 'break'
  const m = /^(Intro|Main|Ending) ([A-D])$/.exec(name)
  if (!m) return null
  const i = ABCD.indexOf(m[2])
  if (m[1] === 'Main') return MAINS[i]
  if (m[1] === 'Intro') return INTROS[i] ?? null
  return ENDINGS[i] ?? null
}

/** Every zen section and the engine's name for it. */
const ALL_SECTIONS: [SectionId, string][] = [
  ...INTROS.map((id, i): [SectionId, string] => [id, `Intro ${ABCD[i]}`]),
  ...MAINS.map((id, i): [SectionId, string] => [id, `Main ${ABCD[i]}`]),
  ...ENDINGS.map((id, i): [SectionId, string] => [id, `Ending ${ABCD[i]}`]),
  ['break', 'Fill In BA'],
]

/** The command a zen section's key sends: the section row's and the Sections pads' own. */
export function sectionCmd(id: SectionId): AppCmd {
  if (id === 'break') return { type: 'break' }
  const main = (MAINS as readonly string[]).indexOf(id)
  if (main >= 0) return { type: 'main', index: main }
  const intro = (INTROS as readonly string[]).indexOf(id)
  if (intro >= 0) return { type: 'intro', index: intro }
  return { type: 'ending', index: (ENDINGS as readonly string[]).indexOf(id) }
}

/** The transport as zen's song form. A fill playing shows the Main it left (`transport.main`). */
export function songForm(state: AppState, beats = 0): StageProps['songForm'] {
  const t = state.transport
  const playing = (t.running ? sectionId(t.section) : null) ?? MAINS[t.main] ?? 'mainA'
  const nextRaw = t.running ? (t.landing ?? t.queued) : t.pendingIntro !== null ? `Intro ${ABCD[t.pendingIntro]}` : null
  const has = new Set(state.style.sections)
  return {
    running: t.running,
    playing,
    next: sectionId(nextRaw) ?? undefined,
    nextAt: whenText(state) || undefined,
    // An empty section list (no style yet) marks nothing absent.
    absent: has.size === 0 ? [] : ALL_SECTIONS.filter(([, name]) => !has.has(name)).map(([id]) => id),
    fillPending: fillPending(state),
    accomp: t.acmp,
    syncStart: t.syncStart,
    syncStop: t.syncStop,
    autoFill: t.autoFill,
    fading: t.fade === 'fadingIn' || t.fade === 'fadingOut' || t.fade === 'holding',
    lit: beats - Math.floor(beats) < 0.5,
  }
}

/**
 * Which way a queued fill goes (zen's `fillPending`): a fill queued (`transport.queued` names a
 * fill) landing on a Main to the right of the one playing is Fill ▲, to the left Fill ▼. A fill
 * landing on the Main playing (Fill Self), the Break, or nothing queued: none.
 */
export function fillPending(state: AppState): 'up' | 'down' | undefined {
  const t = state.transport
  if (!t.queued?.startsWith('Fill') || t.queued === 'Fill In BA' || !t.landing) return undefined
  const m = /^Main ([A-D])$/.exec(t.landing)
  if (!m) return undefined
  const to = ABCD.indexOf(m[1])
  return to > t.main ? 'up' : to < t.main ? 'down' : undefined
}

/** The app's part hue names (r1 r2 r3 l) as zen's hue slots (`yahaha/hues.ts` PART_HUE_INDEX). */
const HUE_SLOT = { r1: 1, r2: 2, r3: 3, l: 4 } as const
/** zen's part (a hue slot name) as the app's part id, what the sound list opens for. */
const PART_ID = { r1: 'right1', r2: 'right2', r3: 'right3', l: 'left' } as const

type BankLamp = StageProps['faders']['partLamps'][number]
type AppLamp = ReturnType<typeof faders>['partLamps'][number]

/** A fader lamp in zen's hues: `m` (the app's deprecated alias of `t`) draws neutral; the rest, `ok` included, pass through. */
const lamp = (l: AppLamp): BankLamp => ({ ...l, hue: l.hue === 'm' ? 't' : l.hue })

type BankStrip = StageProps['faders']['strips'][number]

/**
 * A strip: a part's (r1 r2 r3 l) strip shows its sound under the name, as the former Display's
 * sound row did, and the sound is its own button (`faders.onSound`) with that row's tooltip.
 */
function strip(state: AppState, x: BankStrip): BankStrip {
  if (!(x.hue in HUE_SLOT)) return x
  const part = state.keyboardParts[HUE_SLOT[x.hue as keyof typeof HUE_SLOT] - 1]
  if (!part) return x
  return { ...x, sound: part.sound?.name ?? part.voiceName, soundTip: 'launchkey.fader_sound' }
}

/** zen's Stage props from the app's state. */
export function stageProps(state: AppState, extras: Partial<StageExtras> = {}): StageProps {
  const x: StageExtras = { ...DEFAULTS, ...extras }
  const input = { ...x, state }
  const bar = appBar(input)
  const shown = display(input)
  const mixer = faders(input)
  const knobBank = knobs(input)
  const padBank = pads(input)
  const k = keys(state, x.keyRange, x.picking)
  const m = state.metronome
  const { rightPart, ...keysRest } = k
  return {
    appBar: {
      displayTabs: bar.displayTabs,
      fullTabs: bar.fullTabs,
      chosen: bar.chosen,
      launchkey: bar.launchkey,
      failedPart: bar.failedPart,
      synthOn: bar.synthOn,
      dropouts: bar.dropouts,
      bufferFrames: bar.bufferFrames,
      cpu: bar.cpu,
      metronome: m.on,
      metronomeOpen: x.metronomeOpen,
      metronomeVolume: m.volume,
      metronomeBell: m.bell,
      metronomeAudible: m.audible,
      unison: state.transport.unison,
      help: x.help,
    },
    display: {
      style: {
        name: shown.styleLine.styleName,
        category: shown.styleLine.category,
        timeSignature: shown.styleLine.timeSignature,
        queued: shown.styleLine.queued,
        oneTouch: shown.styleLine.oneTouch,
        oneTouchCount: shown.styleLine.oneTouchCount,
      },
      nowPlaying: {
        playing: shown.nowPlaying.playing,
        next: shown.nowPlaying.next,
        fill: shown.nowPlaying.fill,
        bar: shown.nowPlaying.bar,
        bars: shown.nowPlaying.bars,
        bpm: shown.nowPlaying.bpm,
        styleTempo: Math.round(state.style.tempo),
        running: shown.nowPlaying.running,
        syncStart: shown.nowPlaying.syncStart,
        chord: shown.nowPlaying.chord,
        beat: shown.nowPlaying.beat,
        beats: shown.nowPlaying.beats,
      },
    },
    songForm: songForm(state, x.beats),
    faders: {
      strips: mixer.strips.map((x) => strip(state, x)),
      pageTabs: mixer.pageTabs,
      page: mixer.page,
      layerTabs: mixer.layerTabs,
      layer: mixer.layer,
      partLamps: mixer.partLamps.map(lamp),
      functionLamps: mixer.functionLamps.map(lamp),
    },
    knobs: knobBank,
    pads: {
      pads: padBank.pads as PadItem[],
      banks: padBank.banks,
      bank: padBank.bank,
      bankTips: padBank.bankTips,
      bankName: padBank.bankName,
      lit: padBank.lit,
    },
    keys: { ...keysRest, rightHue: HUE_SLOT[rightPart ?? 'r1'], leftHue: HUE_SLOT.l },
    status: status(state, x.hint),
  }
}

/** What the handlers do besides sending: links and app-side switches. Each defaults to doing nothing. */
export interface StageHandlerDeps {
  /** The latest state (pads and Launchkey controls send what it says). */
  state: () => AppState
  /** A link: a page tab, a part's Channel, its sound list, the browser, the Rack, audio settings. */
  open?: (target: OpenTarget) => void
  /** Help mode asked for. */
  help?: (on: boolean) => void
  /** Tempo − / + held (`down`) and released: the app's TempoHold. Default: one step per press. */
  tempo?: (dir: -1 | 1, down: boolean) => void
  /** The metronome's settings popover: toggled by the ▾, closed by Esc or a press outside. */
  metronomeSettings?: () => void
  metronomeClose?: () => void
  /** The keyboard's split asked for (a note). */
  split?: (note: number) => void
  /** The Shift layer held (`ui.shift`): pads and page buttons send their Shift action. Default: never. */
  shift?: () => boolean
  /** The keyboard's split pick armed or disarmed (`splitPick.armed`). Default: nothing. */
  arm?: (armed: boolean) => void
}

type Handlers = {
  appBar: Pick<StageProps['appBar'], `on${string}` & keyof StageProps['appBar']>
  display: Pick<StageProps['display'], `on${string}` & keyof StageProps['display']>
  songForm: Pick<StageProps['songForm'], `on${string}` & keyof StageProps['songForm']>
  faders: Pick<StageProps['faders'], `on${string}` & keyof StageProps['faders']>
  knobs: Pick<StageProps['knobs'], `on${string}` & keyof StageProps['knobs']>
  pads: Pick<StageProps['pads'], `on${string}` & keyof StageProps['pads']>
  keys: Pick<StageProps['keys'], `on${string}` & keyof StageProps['keys']>
  status: Pick<StageProps['status'], `on${string}` & keyof StageProps['status']>
}

/**
 * zen's Stage callbacks as the app's commands, by region; merge each into that region's props.
 * They are the app Stage's own actions (panels/stage/actions.ts) under zen's names, plus the
 * song form's section and switch keys, which the app's section row sends as toggles.
 */
export function stageHandlers(send: (cmd: AppCmd) => void, deps: StageHandlerDeps): Handlers {
  const { state } = deps
  const a = stageActions({
    state,
    shift: deps.shift ?? (() => false),
    send,
    open: deps.open ?? (() => {}),
    // zen's ? asks for a state (onHelp); the app's own toggle is never called from here.
    toggleHelp: () => {},
    // Default: one step per press, nothing on release (the app passes its TempoHold).
    tempo: deps.tempo ?? ((dir, down) => down && send({ type: dir > 0 ? 'tempoUp' : 'tempoDown' })),
    metronomeSettings: deps.metronomeSettings,
  })
  const keyCb = keysActions({ state, send, arm: deps.arm ?? (() => {}) })
  /** A switch asked for `on`: the command toggles, so it is sent only on a change. */
  const toggle = (now: boolean, on: boolean, cmd: AppCmd) => {
    if (now !== on) send(cmd)
  }
  return {
    appBar: {
      onChoose: a.onchoose,
      onHealth: a.onhealth,
      onMetronome: (on) => send({ type: 'setMetronome', on }),
      onMetronomeSettings: deps.metronomeSettings,
      onMetronomeClose: deps.metronomeClose,
      onMetronomeVolume: (volume) => send({ type: 'setMetronomeVolume', volume: Math.max(0, Math.min(127, Math.round(volume))) }),
      onMetronomeBell: (on) => send({ type: 'setMetronomeBell', on }),
      onUnison: (on) => send({ type: 'setUnison', on }),
      onHelp: (on) => deps.help?.(on),
      onPanic: () => send({ type: 'panic' }),
    },
    display: {
      onPrev: a.onprev,
      onNext: a.onnext,
      onBrowse: a.onbrowse,
      onOneTouch: a.ononetouch,
      onSound: (part) => a.onsound(PART_ID[part]),
      onTempoUp: a.ontempoup,
      onTempoDown: a.ontempodown,
      onTempo: a.ontempo,
      onTap: a.ontaptempo,
      onStyleTempo: a.onstyletempo,
    },
    songForm: {
      onSection: (id) => send(sectionCmd(id)),
      onStartStop: a.onstartstop,
      // Running, Fade fades out and stops (`toggleFade`).
      onStopWithFade: () => send({ type: 'toggleFade' }),
      onAccomp: (on) => send({ type: 'setAcmp', on }),
      onSyncStart: a.onsyncstart,
      onSyncStop: (on) => toggle(state().transport.syncStop, on, { type: 'toggleSyncStop' }),
      onAutoFill: (on) => toggle(state().transport.autoFill, on, { type: 'toggleAutoFill' }),
      onFillUp: a.onfillup,
      onFillDown: a.onfilldown,
      onFade: a.onfade,
      onReset: a.onreset,
    },
    faders: {
      onChoosePage: a.onchoosePage,
      onChooseLayer: a.onchooseLayer,
      onLevel: a.onlevel,
      onOpen: a.onopen,
      // A part strip's sound: that part's sound list (the former Display's `launchkey.fader_sound`).
      onSound: (part) => a.onsound(PART_ID[part]),
      onLamp: a.onlamp,
      onLampLong: a.onlamplong,
      onLampRelease: a.onlamprelease,
      onPageButton: a.onpagebutton,
      onPageLong: a.onpagelong,
      onPageRelease: a.onpagerelease,
    },
    knobs: {
      onPage: a.onknobpage,
      onPress: a.onknobpress,
      onStep: a.onstep,
    },
    pads: {
      onBank: a.onpadbank,
      onPress: a.onpadpress,
    },
    keys: {
      onSplit: (note) => (deps.split ?? keyCb.onsplit)(note),
      onPick: keyCb.onpick,
    },
    status: {
      onClear: a.onclear,
    },
  }
}
