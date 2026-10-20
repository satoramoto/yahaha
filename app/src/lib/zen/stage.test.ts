import { describe, expect, it } from 'vitest'
import { MockSession, type MockOptions } from '../api/mock'
import type { AppCmd, AppState } from '../api/types'
import { faders as appFaders, pads as appPads, stripMeters } from '../../panels/stage/model'
import { DEFAULTS, fillPending, stageHandlers, stageProps } from './stage'

/** The mock's state after `cmds` (and a frame), in `opts`'s scenario. */
function stateOf(opts: MockOptions = {}, ...cmds: AppCmd[]): AppState {
  const session = new MockSession({ manual: true, ...opts })
  for (const c of cmds) session.send(c)
  session.advance(16)
  const s = session.state
  session.dispose()
  return s
}

describe('the fields the pilot left out', () => {
  it('meters and held peaks reach the strips', async () => {
    const session = new MockSession({ demo: true, manual: true })
    session.advance(500)
    const meters = await session.meters()
    const s = session.state
    session.dispose()
    expect(meters).not.toBeNull()
    const holds = stripMeters(s, meters!).map(() => 0.5)
    const p = stageProps(s, { meters, holds })
    // Each strip's meter and held peak are the app model's for the same frame.
    const expected = appFaders({ state: s, meters, holds }).strips
    expect(p.faders.strips.map((x) => [x.meter, x.peak])).toEqual(expected.map((x) => [x.meter, x.peak]))
    expect(p.faders.strips.some((x) => (x.peak ?? 0) > 0)).toBe(true)
    // Without a frame every meter is empty.
    expect(stageProps(s).faders.strips.every((x) => !x.meter)).toBe(true)
  })

  it('the status line shows the hint it is given', () => {
    const hint = { title: 'Accomp', body: 'Turns the accompaniment on and off.', keys: 'A', launchkey: null }
    const s = stateOf()
    expect(stageProps(s, { hint }).status.hint).toEqual(hint)
    expect(stageProps(s).status.hint).toBeNull()
  })

  it('the keys show an armed split pick', () => {
    const s = stateOf()
    expect(stageProps(s, { picking: true }).keys.picking).toBe(true)
    expect(stageProps(s).keys.picking).toBe(false)
  })

  it('pad faces pass through as the app model draws them: chosen, lamp, unavailable', () => {
    const faces = new Set<string>()
    for (const page of ['racks', 'chord', 'setup', 'multiPads'] as const) {
      const s = stateOf({ demo: true }, { type: 'toggleUpper' }, { type: 'setPadPage', page })
      const zen = stageProps(s).pads.pads.map((p) => p.state)
      expect(zen).toEqual(appPads({ state: s, beats: 0 }).pads.map((p) => p.state))
      zen.forEach((x) => faces.add(x ?? 'idle'))
    }
    expect([...faces]).toEqual(expect.arrayContaining(['chosen', 'unavailable']))
  })

  it("the Style page's mute lamps keep hue ok", () => {
    const s = stateOf({ demo: true }, { type: 'toggleFaderPage' })
    const lamps = [...stageProps(s).faders.partLamps, ...stageProps(s).faders.functionLamps]
    expect(lamps.some((l) => l.hue === 'ok')).toBe(true)
  })

  it('fillPending: a fill queued toward a Main to the right is up, to the left down, else none', () => {
    const base = stateOf()
    const at = (queued: string | null, landing: string | null, main: number): AppState => ({
      ...base,
      transport: { ...base.transport, queued, landing, main },
    })
    expect(fillPending(at('Fill In AB', 'Main B', 0))).toBe('up')
    expect(fillPending(at('Fill In BA', 'Main A', 1))).toBeUndefined() // the Break
    expect(fillPending(at('Fill In CB', 'Main B', 2))).toBe('down')
    expect(fillPending(at('Fill In BB', 'Main B', 1))).toBeUndefined()
    expect(fillPending(at('Main C', null, 0))).toBeUndefined()
    expect(fillPending(at(null, null, 0))).toBeUndefined()
    expect(stageProps(at('Fill In AB', 'Main B', 0)).songForm.fillPending).toBe('up')
  })

  it('first run: stopped, no Launchkey', () => {
    const s = stateOf({ scenario: 'firstRun' })
    const p = stageProps(s)
    expect(p.songForm.running).toBe(false)
    expect(p.display.nowPlaying.running).toBe(false)
    expect(p.appBar.launchkey).toBe(s.pads.connected)
    expect(p.appBar.launchkey).toBe(false)
  })

  it('swapRight1: the swap layer held shows in the mixer and knobs as the app model draws them', () => {
    const s = stateOf({ scenario: 'swapRight1' })
    expect(s.surface.layer.type).toBe('swap')
    const p = stageProps(s)
    expect(p.knobs.knobs).toHaveLength(Math.min(8, s.knobs.knobs.length))
    expect(p.faders.layer).toBe(s.mixer.faderLayer)
  })

  it('Shift and the split pick reach the handlers', () => {
    const s = stateOf()
    const sent: AppCmd[] = []
    const armed: boolean[] = []
    const on = stageHandlers((c) => sent.push(c), { state: () => s, shift: () => true, arm: (a) => armed.push(a) })
    on.faders.onPageButton?.()
    on.keys.onPick?.(true)
    expect(sent).toEqual([{ type: 'stepFaderLayer', delta: 1 }])
    expect(armed).toEqual([!s.paramLocks.splitPoint])
  })
})

describe('stageProps and stageHandlers from the mock default state', () => {
  it('maps the fields both sides have, defaults the rest, and sends commands back', () => {
    const session = new MockSession()
    const s = session.state
    session.dispose()
    const p = stageProps(s)
    const t = s.transport

    // App bar: the Launchkey, the synth, the metronome and Unison come from the state; help and the popover from DEFAULTS.
    expect(p.appBar.launchkey).toBe(s.pads.connected)
    expect(p.appBar.synthOn).toBe(s.io.synth !== null)
    expect(p.appBar.metronome).toBe(s.metronome.on)
    expect(p.appBar.metronomeVolume).toBe(s.metronome.volume)
    expect(p.appBar.metronomeBell).toBe(s.metronome.bell)
    expect(p.appBar.unison).toBe(t.unison)
    expect(p.appBar.help).toBe(DEFAULTS.help)
    expect(p.appBar.metronomeOpen).toBe(false)
    expect(p.appBar.chosen).toBe('stage')

    // Display: the style, the tempo and the style's own tempo, the One Touch settings.
    expect(p.display.style.name).toBe(s.style.name)
    expect(p.display.style.timeSignature).toBe(`${s.style.timeSignature[0]}/${s.style.timeSignature[1]}`)
    expect(p.display.style.oneTouch).toBe(s.ots.applied)
    expect(p.display.style.oneTouchCount).toBe(s.ots.settings.length)
    expect(p.display.nowPlaying.bpm).toBe(Math.round(t.tempo))
    expect(p.display.nowPlaying.styleTempo).toBe(Math.round(s.style.tempo))
    expect(p.display.nowPlaying.running).toBe(t.running)

    // Song form: the transport's switches and the section playing.
    expect(p.songForm.running).toBe(t.running)
    expect(p.songForm.accomp).toBe(t.acmp)
    expect(p.songForm.syncStart).toBe(t.syncStart)
    expect(p.songForm.syncStop).toBe(t.syncStop)
    expect(p.songForm.autoFill).toBe(t.autoFill)
    expect(p.songForm.playing).toMatch(/^(intro[1-3]|main[A-D]|ending[1-3]|break)$/)

    // Mixer, knobs, pads, keys, status.
    expect(p.faders.page).toBe(s.mixer.faderPage)
    expect(p.faders.layer).toBe(s.mixer.faderLayer)
    expect(p.faders.strips.length).toBeGreaterThan(0)
    expect(p.knobs.knobs).toHaveLength(Math.min(8, s.knobs.knobs.length))
    expect(p.pads.pads).toHaveLength(16)
    expect(p.pads.banks).toEqual(s.pads.pages.map((x) => x.name))
    expect(p.keys.split).toBe(s.keyboard.leftSplit)
    expect(p.keys.leftHue).toBe(4)
    expect([1, 2, 3]).toContain(p.keys.rightHue)
    expect(p.status.text).toBe(s.message?.text ?? null)

    // Handlers: zen's callbacks become the app's commands.
    const sent: AppCmd[] = []
    const on = stageHandlers((c) => sent.push(c), { state: () => s })
    on.songForm.onStartStop?.()
    on.songForm.onSection?.('mainC')
    on.songForm.onSection?.('break')
    on.songForm.onAccomp?.(!t.acmp)
    on.appBar.onMetronome?.(true)
    on.knobs.onStep?.(2, -1)
    on.status.onClear?.()
    expect(sent).toEqual([
      { type: 'startStop' },
      { type: 'main', index: 2 },
      { type: 'break' },
      { type: 'setAcmp', on: !t.acmp },
      { type: 'setMetronome', on: true },
      { type: 'turnKnob', knob: 2, delta: -1 },
      { type: 'clearMessage' },
    ])
  })
})
