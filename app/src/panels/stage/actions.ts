// What the Stage screen's controls do: every callback of the library's `Stage`, as the
// command it sends (kit tables, docs/specs/push/kit.md) or the page it opens. Pure of
// Svelte: StageScreen.svelte passes the stores in as `StageDeps`, tests pass fakes.
//
// Parity (kit › Interaction conventions): a control that mirrors a Launchkey control sends
// exactly what the state says that control sends (`surface.controls[i].action`, or its
// `shiftAction` with Shift; `pads.pads[i].action`), and nothing when that is null.

import type { ComponentProps } from 'svelte'
import type { AppCmd, AppState, ControlId, FaderLayer, FaderPage } from '../../lib/api/types'
import type { HealthTarget } from '../../ui/HealthSlot/health'
import type Stage from '../../ui/Stage/Stage.svelte'
import { KNOB_PAGES, LAYER_SEND } from './model'

type StageProps = ComponentProps<typeof Stage>

/** Where a link on the Stage goes (Stage.md D32, until each target's page is built). */
export type OpenTarget =
  /** A page tab: its page (the Stage, or "Coming soon"). */
  | { page: string }
  /** Channel for a part (0–3 keyboard, 4–11 Style). */
  | { channel: number }
  /** The quick sound list for a keyboard part: for now Library › Sounds loading into it. */
  | { sounds: number }
  | 'browser'
  | 'rack'
  | 'effects'
  | 'multipad'
  | 'settingsAudio'

export interface StageDeps {
  /** The latest state. */
  state: () => AppState
  /** The Shift layer (`ui.shift`). */
  shift: () => boolean
  send: (cmd: AppCmd) => void
  open: (target: OpenTarget) => void
  /** Help mode on or off (`tips.toggleHelp`). */
  toggleHelp: () => void
  /** Tempo − (`dir` −1) or + (1) went down or up (`TempoHold`). */
  tempo: (dir: -1 | 1, down: boolean) => void
}

/** The Stage's callbacks (every `on…` prop it takes). */
export type StageActions = { [K in keyof StageProps as K extends `on${string}` ? K : never]-?: StageProps[K] }

const PART_IDS = ['right1', 'right2', 'right3', 'left']
/** Strip id → its Launchkey fader (0–8). */
const STRIP_FADER: Record<string, number> = {
  right1: 0, right2: 1, right3: 2, left: 3, style: 4, multiPad: 5, fader7: 6, fader8: 7, master: 8,
  ...Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8].map((n) => [`style${n}`, n - 1])),
}

/**
 * What a strip's fader sends for `level` on the layer showing: the old mixer Strip's
 * commands, whatever the live rack maps the Launchkey fader to (a keyboard part's
 * setPartVolume, setPartPan or setPartSend; a Style part's setStylePartVolume or
 * setStylePartSend, nothing on Pan; Style, Multi Pad and Master their volumes), rounded to
 * a whole MIDI value and clamped to 0–127. Faders 7 and 8, unused on Panel, send what the
 * state says (`surface.faders[i].set`). Null: nothing to send.
 */
export function levelCommand(s: AppState, id: string, level: number): AppCmd | null {
  const v = Math.max(0, Math.min(127, Math.round(level)))
  const layer = s.mixer.faderLayer
  const send = LAYER_SEND[layer]
  const part = PART_IDS.indexOf(id)
  if (part >= 0) {
    if (layer === 'volume') return { type: 'setPartVolume', part, volume: v }
    if (layer === 'pan') return { type: 'setPartPan', part, pan: v }
    return { type: 'setPartSend', part, send: send!, value: v }
  }
  if (id === 'style') return { type: 'setStyleVolume', volume: v }
  if (id === 'multiPad') return { type: 'setMultiPadVolume', volume: v }
  if (id === 'master') return s.mixer.master === null ? null : { type: 'setMasterVolume', volume: v }
  const style = /^style([1-8])$/.exec(id)
  if (style) {
    const i = Number(style[1]) - 1
    if (layer === 'volume') return { type: 'setStylePartVolume', part: i, volume: v }
    return send ? { type: 'setStylePartSend', part: i, send, value: v } : null
  }
  const f = s.surface.faders[STRIP_FADER[id] ?? -1]
  if (!f?.set) return null
  const set = f.set as Record<string, unknown>
  const field = 'volume' in set ? 'volume' : 'pan' in set ? 'pan' : 'value'
  return { ...set, [field]: v } as AppCmd
}

export function stageActions(d: StageDeps): StageActions {
  const send = (cmd: AppCmd | null | undefined) => {
    if (cmd) d.send(cmd)
  }
  const control = (id: ControlId) => {
    const c = d.state().surface.controls.find((x) => x.id === id)
    return c ? (d.shift() ? c.shiftAction : c.action) : null
  }
  const partIndex = (id: string) => PART_IDS.indexOf(id)
  /** Sound was switched on by a long press of its lamp: its release switches it off (D18). */
  let soundHeld = false

  return {
    // App bar
    onchoose: (id) => d.open({ page: id }),
    onhealth: (target: HealthTarget) => d.open(target.page === 'channel' ? { channel: target.part } : 'settingsAudio'),

    // Section row
    onaccomp: () => send({ type: 'toggleAcmp' }),
    onmetronome: () => send({ type: 'toggleMetronome' }),
    // No metronome popover yet (#509): the caret does nothing (D32).
    onmetronomesettings: () => {},
    onunison: () => send({ type: 'toggleUnison' }),
    onpanic: () => send({ type: 'panic' }),
    onhelp: () => d.toggleHelp(),

    // Display
    onprev: () => send(control('trackPrev')),
    onnext: () => send(control('trackNext')),
    onbrowse: () => d.open('browser'),
    ononetouch: (n) => {
      if (n >= 1 && n <= d.state().ots.settings.length) send({ type: 'recallOts', index: n - 1 })
    },
    // Deprecated on the Stage (the sends, the rack and the part tags left the display); kept
    // working for any caller that still passes them.
    onsends: () => d.open('effects'),
    onrack: () => d.open('rack'),
    onpart: (id) => d.open({ channel: partIndex(id) }),
    onsound: (id) => d.open({ sounds: partIndex(id) }),

    // Faders
    onchoosePage: (id) => send({ type: 'setFaderPage', page: id as FaderPage }),
    onchooseLayer: (id) => send({ type: 'setFaderLayer', layer: id as FaderLayer }),
    onlevel: (id, level) => send(levelCommand(d.state(), id, level)),
    onopen: (id) => {
      const s = d.state()
      const i = STRIP_FADER[id]
      if (id.startsWith('style') && id !== 'style') return d.open({ channel: 4 + i })
      // A part's strip is the part's whatever the rack maps its Launchkey fader to: Channel.
      if (i < 4) return d.open({ channel: i })
      if (i === 6 || i === 7) {
        const label = s.surface.faders[i]?.label ?? ''
        return label === '' ? undefined : d.open('rack')
      }
      if (id === 'style') return send({ type: 'setFaderPage', page: 'style' })
      if (id === 'multiPad') return d.open('multipad')
      if (id === 'master') return d.open('effects')
    },
    onlamp: (id) => {
      const s = d.state()
      const part = partIndex(id)
      if (part >= 0) {
        if (d.shift()) return d.open({ channel: part })
        if (s.surface.layer.type === 'swap') return send({ type: 'setLayer', layer: { type: 'none' } })
        return send({ type: 'togglePart', part })
      }
      if (id === 'sound') {
        soundHeld = false
        return send({ type: 'setLayer', layer: s.surface.layer.type === 'sound' ? { type: 'none' } : { type: 'sound' } })
      }
      if (id === 'harmArp') return send({ type: 'toggleHarmonyArp' })
      if (id === 'leftHold') return send({ type: 'toggleLeftHold' })
      if (id === 'looper') return send({ type: 'looperOnOff' })
      const fb = /^fb([1-8])$/.exec(id)
      if (fb) send(control(`faderButton${fb[1]}` as ControlId))
    },
    onlamplong: (id) => {
      const s = d.state()
      const part = partIndex(id)
      if (part >= 0) return send({ type: 'setLayer', layer: { type: 'swap', part } })
      if (id === 'sound' && s.surface.layer.type !== 'sound') {
        soundHeld = true
        return send({ type: 'setLayer', layer: { type: 'sound' } })
      }
      if (id === 'looper') return send({ type: 'looperRec' })
    },
    onlamprelease: (id) => {
      if (id === 'sound' && soundHeld) {
        soundHeld = false
        send({ type: 'setLayer', layer: { type: 'none' } })
      }
    },
    onpagebutton: () => send(d.shift() ? { type: 'stepFaderLayer', delta: 1 } : { type: 'toggleFaderPage' }),

    // Knobs: a page tab chooses its page (KNOB_PAGES' order). Swap mode shows one tab, the
    // swap itself: choosing it changes nothing. The ▲▼ callbacks are deprecated, not drawn.
    onknobpage: (index) => {
      const page = KNOB_PAGES[index]
      if (page && d.state().surface.layer.type !== 'swap') send({ type: 'setKnobPage', page: page.id })
    },
    onpageup: () => send({ type: 'stepKnobPage', delta: -1 }),
    onpagedown: () => send({ type: 'stepKnobPage', delta: 1 }),
    onknobpress: () => {},
    onstep: (index, delta) => send({ type: 'turnKnob', knob: index, delta }),

    // Pads: a bank tab chooses its page, in the state's page order (`pads.pages`).
    onpadbank: (index) => {
      const page = d.state().pads.pages[index]
      if (page) send({ type: 'setPadPage', page: page.page })
    },
    onbankup: () => send(control('padBankUp')),
    onbankdown: () => send(control('padBankDown')),
    // A pad sends what the state says it sends, as the old screen pads and the hardware do.
    // A latched Sound stays latched (the pointer is free for the pads) until Sound is
    // clicked again, as on the old Launchkey panel.
    onpadpress: (index) => send(d.state().pads.pads[index]?.action),

    // Transport and tempo
    onstartstop: () => send({ type: 'startStop' }),
    // Sync Start asks for the state it wants; the command toggles, so send it only on a change.
    onsyncstart: (on) => {
      if (on !== d.state().transport.syncStart) send({ type: 'toggleSyncStart' })
    },
    onstop: () => send({ type: 'stop' }),
    onstoplong: () => send({ type: 'stop' }),
    onreset: () => send({ type: 'sectionReset' }),
    onfade: () => send({ type: 'toggleFade' }),
    onfillup: () => send({ type: 'fillUp' }),
    onfilldown: () => send({ type: 'fillDown' }),
    ontempoup: (down) => d.tempo(1, down),
    ontempodown: (down) => d.tempo(-1, down),
    onstyletempo: () => send({ type: 'resetTempo' }),
    // A drag, scroll or arrow key on the display's tempo: that tempo, whole BPM, 5–500.
    ontempo: (bpm) => {
      if (Number.isFinite(bpm)) send({ type: 'setTempo', bpm: Math.max(5, Math.min(500, Math.round(bpm))) })
    },

    // Status line
    onclear: () => send({ type: 'clearMessage' }),
  }
}
