// The Stage's callbacks: each sends the command the kit tables name, or opens its link.

import { describe, expect, it } from 'vitest'
import { emptyState } from '../../lib/api/constants'
import type { AppCmd, AppState, ControlId, Pad, SurfaceFader } from '../../lib/api/types'
import { stageActions, type OpenTarget, type StageActions } from './actions'

/** A click on a lamp: the lamp passes the state it asks for, which the wiring ignores (it
 * sends a toggle), so pass `true` whatever the lamp shows. */
const lampClick = (actions: StageActions, id: string) => actions.onlamp(id, true)

function fake(edit?: (s: AppState) => void) {
  const state = emptyState()
  edit?.(state)
  const sent: AppCmd[] = []
  const opened: OpenTarget[] = []
  const tempo: [number, boolean][] = []
  let help = 0
  const deps = {
    state,
    shift: false,
    sent,
    opened,
    tempo,
    help: () => help,
  }
  const actions = stageActions({
    state: () => deps.state,
    shift: () => deps.shift,
    send: (cmd) => sent.push(cmd),
    open: (t) => opened.push(t),
    toggleHelp: () => help++,
    tempo: (dir, down) => tempo.push([dir, down]),
  })
  /** What was sent and opened since the last call, then forget it. */
  const take = () => {
    const out = { sent: [...sent], opened: [...opened] }
    sent.length = 0
    opened.length = 0
    return out
  }
  return { deps, actions, take }
}

function setControl(s: AppState, id: ControlId, action: AppCmd | null, shiftAction: AppCmd | null = null) {
  const c = s.surface.controls.find((x) => x.id === id)!
  c.action = action
  c.shiftAction = shiftAction
}

const pad = (action: AppCmd | null): Pad => ({ note: 0, label: 'X', key: '', rgb: [0, 0, 0], level: 'dim', anim: 'solid', action, palette: null })
const fader = (label: string, set: SurfaceFader['set']): SurfaceFader => ({ label, value: 64, waiting: false, position: null, set })

describe('surface controls (parity)', () => {
  for (const [cb, id] of [
    ['onprev', 'trackPrev'],
    ['onnext', 'trackNext'],
    ['onbankup', 'padBankUp'],
    ['onbankdown', 'padBankDown'],
  ] as const) {
    it(`${cb} sends ${id}'s action, its shiftAction with Shift, nothing when null`, () => {
      const { deps, actions, take } = fake((s) => setControl(s, id, { type: 'stepStyle', delta: 1 }, { type: 'toggleOtsLink' }))
      actions[cb]()
      expect(take().sent).toEqual([{ type: 'stepStyle', delta: 1 }])
      deps.shift = true
      actions[cb]()
      expect(take().sent).toEqual([{ type: 'toggleOtsLink' }])
      setControl(deps.state, id, null, null)
      actions[cb]()
      deps.shift = false
      actions[cb]()
      expect(take().sent).toEqual([])
    })
  }
})

describe('pads', () => {
  it('a pad press sends its action; an unused pad sends nothing', () => {
    const { actions, take } = fake((s) => (s.pads.pads = [pad({ type: 'main', index: 1 }), pad(null)]))
    actions.onpadpress(0)
    actions.onpadpress(1)
    actions.onpadpress(5)
    expect(take().sent).toEqual([{ type: 'main', index: 1 }])
  })

  it('a pad press releases a latched Sound', () => {
    const { deps, actions, take } = fake((s) => (s.pads.pads = [pad({ type: 'pressQuickRack', slot: 0 })]))
    lampClick(actions,'sound')
    expect(take().sent).toEqual([{ type: 'setLayer', layer: { type: 'sound' } }])
    deps.state.surface.layer = { type: 'sound' }
    actions.onpadpress(0)
    expect(take().sent).toEqual([{ type: 'pressQuickRack', slot: 0 }, { type: 'setLayer', layer: { type: 'none' } }])
  })

  it('a pad press keeps a Sound held by a long press; its release ends it', () => {
    const { deps, actions, take } = fake((s) => (s.pads.pads = [pad({ type: 'pressQuickRack', slot: 2 })]))
    actions.onlamplong('sound')
    expect(take().sent).toEqual([{ type: 'setLayer', layer: { type: 'sound' } }])
    deps.state.surface.layer = { type: 'sound' }
    actions.onpadpress(0)
    expect(take().sent).toEqual([{ type: 'pressQuickRack', slot: 2 }])
    actions.onlamprelease('sound')
    expect(take().sent).toEqual([{ type: 'setLayer', layer: { type: 'none' } }])
    actions.onlamprelease('sound')
    expect(take().sent).toEqual([])
  })
})

describe('lamps', () => {
  it('a part lamp toggles its part', () => {
    const { actions, take } = fake()
    lampClick(actions,'right1')
    lampClick(actions,'right3')
    lampClick(actions,'left')
    expect(take().sent).toEqual([
      { type: 'togglePart', part: 0 },
      { type: 'togglePart', part: 2 },
      { type: 'togglePart', part: 3 },
    ])
  })

  it('in swap mode a part lamp leaves swap', () => {
    const { actions, take } = fake((s) => (s.surface.layer = { type: 'swap', part: 1 }))
    lampClick(actions,'right1')
    expect(take().sent).toEqual([{ type: 'setLayer', layer: { type: 'none' } }])
  })

  it('with Shift a part lamp opens Channel', () => {
    const { deps, actions, take } = fake()
    deps.shift = true
    lampClick(actions,'right2')
    expect(take()).toEqual({ sent: [], opened: [{ channel: 1 }] })
  })

  it('a long press on a part lamp enters swap for it', () => {
    const { actions, take } = fake()
    actions.onlamplong('left')
    expect(take().sent).toEqual([{ type: 'setLayer', layer: { type: 'swap', part: 3 } }])
  })

  it('Sound: a click latches and unlatches; a long press while on does nothing, and no release follows', () => {
    const { deps, actions, take } = fake()
    lampClick(actions,'sound')
    expect(take().sent).toEqual([{ type: 'setLayer', layer: { type: 'sound' } }])
    deps.state.surface.layer = { type: 'sound' }
    actions.onlamplong('sound')
    actions.onlamprelease('sound')
    expect(take().sent).toEqual([])
    lampClick(actions,'sound')
    expect(take().sent).toEqual([{ type: 'setLayer', layer: { type: 'none' } }])
  })

  it('Sound long press on, release off', () => {
    const { actions, take } = fake()
    actions.onlamplong('sound')
    actions.onlamprelease('sound')
    expect(take().sent).toEqual([
      { type: 'setLayer', layer: { type: 'sound' } },
      { type: 'setLayer', layer: { type: 'none' } },
    ])
  })

  it('Harm/Arp, L Hold, Looper click and Looper long press', () => {
    const { actions, take } = fake()
    lampClick(actions,'harmArp')
    lampClick(actions,'leftHold')
    lampClick(actions,'looper')
    actions.onlamplong('looper')
    expect(take().sent).toEqual([{ type: 'toggleHarmonyArp' }, { type: 'toggleLeftHold' }, { type: 'looperOnOff' }, { type: 'looperRec' }])
  })

  it('the Style page lamps fb1… send their fader button\'s action (shiftAction with Shift)', () => {
    const { deps, actions, take } = fake((s) => {
      setControl(s, 'faderButton1', { type: 'toggleStylePart', part: 0 }, { type: 'selectPart', part: 4 })
      setControl(s, 'faderButton8', { type: 'toggleStylePart', part: 7 })
    })
    lampClick(actions,'fb1')
    lampClick(actions,'fb8')
    lampClick(actions,'fb3')
    expect(take().sent).toEqual([
      { type: 'toggleStylePart', part: 0 },
      { type: 'toggleStylePart', part: 7 },
    ])
    deps.shift = true
    lampClick(actions,'fb1')
    expect(take().sent).toEqual([{ type: 'selectPart', part: 4 }])
  })
})

describe('faders', () => {
  it('onlevel fills volume, pan or value in the strip\'s fader `set`, rounded', () => {
    const { actions, take } = fake((s) => {
      s.surface.faders[0] = fader('RIGHT 1', { type: 'setPartVolume', part: 0, volume: 0 })
      s.surface.faders[1] = fader('RIGHT 2', { type: 'setPartPan', part: 1, pan: 0 })
      s.surface.faders[4] = fader('STYLE', { type: 'setStyleVolume', volume: 0 })
      s.surface.faders[2] = fader('RIGHT 3', { type: 'setPartSend', part: 2, send: 'reverb', value: 0 })
      s.surface.faders[8] = fader('MASTER', { type: 'setMasterVolume', volume: 0 })
    })
    actions.onlevel('right1', 99.6)
    actions.onlevel('right2', 20)
    actions.onlevel('right3', 40)
    actions.onlevel('style', 80)
    actions.onlevel('master', 127)
    actions.onlevel('multiPad', 50)
    actions.onlevel('nonsense', 50)
    expect(take().sent).toEqual([
      { type: 'setPartVolume', part: 0, volume: 100 },
      { type: 'setPartPan', part: 1, pan: 20 },
      { type: 'setPartSend', part: 2, send: 'reverb', value: 40 },
      { type: 'setStyleVolume', volume: 80 },
      { type: 'setMasterVolume', volume: 127 },
    ])
  })

  it('onlevel on a Style-page strip uses that fader', () => {
    const { actions, take } = fake((s) => {
      s.surface.faders[2] = fader('BASS', { type: 'setStylePartVolume', part: 2, volume: 0 })
    })
    actions.onlevel('style3', 77)
    expect(take().sent).toEqual([{ type: 'setStylePartVolume', part: 2, volume: 77 }])
  })

  it('onopen: a part opens Channel, a rack target the Rack, Style its page, Multi Pad, Master, style1…', () => {
    const { actions, take } = fake((s) => {
      s.surface.faders[0].label = 'RIGHT 1'
      s.surface.faders[1].label = 'R1 PAN'
      s.surface.faders[6].label = 'X'
    })
    actions.onopen('right1')
    actions.onopen('right2')
    actions.onopen('right3')
    actions.onopen('fader7')
    actions.onopen('multiPad')
    actions.onopen('master')
    actions.onopen('style1')
    actions.onopen('style8')
    expect(take().opened).toEqual([{ channel: 0 }, 'rack', { channel: 2 }, 'rack', 'multipad', 'effects', { channel: 4 }, { channel: 11 }])
    actions.onopen('style')
    expect(take()).toEqual({ sent: [{ type: 'setFaderPage', page: 'style' }], opened: [] })
  })

  it('page and layer tabs, the page button with and without Shift', () => {
    const { deps, actions, take } = fake()
    actions.onchoosePage('style')
    actions.onchooseLayer('reverb')
    actions.onpagebutton()
    deps.shift = true
    actions.onpagebutton()
    expect(take().sent).toEqual([
      { type: 'setFaderPage', page: 'style' },
      { type: 'setFaderLayer', layer: 'reverb' },
      { type: 'toggleFaderPage' },
      { type: 'stepFaderLayer', delta: 1 },
    ])
  })
})

describe('display, knobs, transport, app bar', () => {
  it('One Touch n recalls index n−1 within the settings, nothing outside', () => {
    const { actions, take } = fake((s) => (s.ots.settings = [1, 2, 3].map((n) => ({ name: `OTS ${n}`, parts: [] }))))
    actions.ononetouch(0)
    actions.ononetouch(1)
    actions.ononetouch(3)
    actions.ononetouch(4)
    expect(take().sent).toEqual([
      { type: 'recallOts', index: 0 },
      { type: 'recallOts', index: 2 },
    ])
  })

  it('display links', () => {
    const { actions, take } = fake()
    actions.onbrowse()
    actions.onsends()
    actions.onrack()
    actions.onpart('right3')
    actions.onsound('left')
    expect(take().opened).toEqual(['browser', 'effects', 'rack', { channel: 2 }, { sounds: 3 }])
  })

  it('section row', () => {
    const { deps, actions, take } = fake()
    // Each switch toggles whatever state its lamp asks for.
    actions.onaccomp(true)
    actions.onmetronome(false)
    actions.onunison(true)
    actions.onpanic()
    actions.onhelp(true)
    expect(take().sent).toEqual([{ type: 'toggleAcmp' }, { type: 'toggleMetronome' }, { type: 'toggleUnison' }, { type: 'panic' }])
    expect(deps.help()).toBe(1)
  })

  it('knobs: page up/down and a step', () => {
    const { actions, take } = fake()
    actions.onpageup()
    actions.onpagedown()
    actions.onstep(3, -1)
    expect(take().sent).toEqual([
      { type: 'stepKnobPage', delta: -1 },
      { type: 'stepKnobPage', delta: 1 },
      { type: 'turnKnob', knob: 3, delta: -1 },
    ])
  })

  it('transport buttons', () => {
    const { actions, take } = fake()
    actions.onstartstop()
    actions.onstop()
    actions.onstoplong()
    actions.onreset()
    actions.onfade()
    actions.onfillup()
    actions.onfilldown()
    actions.onstyletempo()
    actions.onclear()
    expect(take().sent).toEqual([
      { type: 'startStop' },
      { type: 'stop' },
      { type: 'stop' },
      { type: 'sectionReset' },
      { type: 'toggleFade' },
      { type: 'fillUp' },
      { type: 'fillDown' },
      { type: 'resetTempo' },
      { type: 'clearMessage' },
    ])
  })

  it('Tempo ± go to deps.tempo with the direction and down/up', () => {
    const { deps, actions, take } = fake()
    actions.ontempoup(true)
    actions.ontempoup(false)
    actions.ontempodown(true)
    actions.ontempodown(false)
    expect(deps.tempo).toEqual([
      [1, true],
      [1, false],
      [-1, true],
      [-1, false],
    ])
    expect(take().sent).toEqual([])
  })

  it('health targets: a failed part opens its Channel, else audio settings', () => {
    const { actions, take } = fake()
    actions.onhealth({ page: 'channel', part: 2 })
    actions.onhealth({ page: 'settings', tab: 'system' })
    expect(take().opened).toEqual([{ channel: 2 }, 'settingsAudio'])
  })

  it('page tabs open their page', () => {
    const { actions, take } = fake()
    actions.onchoose('effects')
    actions.onchoose('stage')
    expect(take().opened).toEqual([{ page: 'effects' }, { page: 'stage' }])
  })
})
