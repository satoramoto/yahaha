import { describe, expect, it } from 'vitest'
import { MockSession } from '../api/mock'
import type { AppCmd } from '../api/types'
import { DEFAULTS, stageHandlers, stageProps } from './stage'

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
