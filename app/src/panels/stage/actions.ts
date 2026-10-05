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
const PART_FADER_LABELS = ['RIGHT 1', 'RIGHT 2', 'RIGHT 3', 'LEFT']
/** Strip id → its Launchkey fader (0–8). */
const STRIP_FADER: Record<string, number> = {
  right1: 0, right2: 1, right3: 2, left: 3, style: 4, multiPad: 5, fader7: 6, fader8: 7, master: 8,
  ...Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8].map((n) => [`style${n}`, n - 1])),
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
    onsends: () => d.open('effects'),
    onrack: () => d.open('rack'),
    onpart: (id) => d.open({ channel: partIndex(id) }),
    onsound: (id) => d.open({ sounds: partIndex(id) }),

    // Faders
    onchoosePage: (id) => send({ type: 'setFaderPage', page: id as FaderPage }),
    onchooseLayer: (id) => send({ type: 'setFaderLayer', layer: id as FaderLayer }),
    onlevel: (id, level) => {
      const f = d.state().surface.faders[STRIP_FADER[id] ?? -1]
      if (!f?.set) return
      const set = f.set as Record<string, unknown>
      const field = 'volume' in set ? 'volume' : 'pan' in set ? 'pan' : 'value'
      d.send({ ...set, [field]: Math.round(level) } as AppCmd)
    },
    onopen: (id) => {
      const s = d.state()
      const i = STRIP_FADER[id]
      if (id.startsWith('style') && id !== 'style') return d.open({ channel: 4 + i })
      if (i < 4 || i === 6 || i === 7) {
        // A fader the live rack maps elsewhere opens the Rack (D63); a part's opens Channel.
        const label = s.surface.faders[i]?.label ?? ''
        return d.open(i < 4 && (label === '' || label === PART_FADER_LABELS[i]) ? { channel: i } : 'rack')
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

    // Knobs
    onpageup: () => send({ type: 'stepKnobPage', delta: -1 }),
    onpagedown: () => send({ type: 'stepKnobPage', delta: 1 }),
    onknobpress: () => {},
    onstep: (index, delta) => send({ type: 'turnKnob', knob: index, delta }),

    // Pads
    onbankup: () => send(control('padBankUp')),
    onbankdown: () => send(control('padBankDown')),
    onpadpress: (index) => {
      const s = d.state()
      send(s.pads.pads[index]?.action)
      // A latched Sound ends with the next pad pressed on screen (D18; C3 brings the hardware's).
      if (s.surface.layer.type === 'sound' && !soundHeld) send({ type: 'setLayer', layer: { type: 'none' } })
    },

    // Transport and tempo
    onstartstop: () => send({ type: 'startStop' }),
    onstop: () => send({ type: 'stop' }),
    onstoplong: () => send({ type: 'stop' }),
    onreset: () => send({ type: 'sectionReset' }),
    onfade: () => send({ type: 'toggleFade' }),
    onfillup: () => send({ type: 'fillUp' }),
    onfilldown: () => send({ type: 'fillDown' }),
    ontempoup: (down) => d.tempo(1, down),
    ontempodown: (down) => d.tempo(-1, down),
    onstyletempo: () => send({ type: 'resetTempo' }),

    // Status line
    onclear: () => send({ type: 'clearMessage' }),
  }
}
