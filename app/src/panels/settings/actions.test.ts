// The Settings pages' changes: each sends the command the old drawer's page sent for it. Most
// cases check the command; the round trips run it through a MockSession and check the state.

import { afterEach, describe, expect, it } from 'vitest'
import { MockSession } from '../../lib/api/mock'
import type { SettingsCmd } from '../../lib/api/settings.svelte'
import { DEFAULT_PAD_PAGES, type AppCmd, type AppState } from '../../lib/api/types'
import type { SettingsPageId } from '../../ui/Settings/types'
import { settingsActions } from './actions'

let session: MockSession | null = null
afterEach(() => {
  session?.dispose()
  session = null
})

function setup(edit?: (s: AppState) => void) {
  session = new MockSession({ demo: true, manual: true })
  session.advance(16)
  const s = session
  edit?.(s.state)
  const sent: AppCmd[] = []
  const settingsSent: SettingsCmd[] = []
  const themes: string[] = []
  const pages: SettingsPageId[] = []
  const actions = settingsActions({
    state: () => s.state,
    send: (cmd) => {
      sent.push(cmd)
      s.send(cmd)
      s.advance(16)
    },
    settingsSend: (cmd) => {
      settingsSent.push(cmd)
      s.send(cmd)
      s.advance(16)
    },
    setTheme: (t) => themes.push(t),
    openPage: (p) => pages.push(p),
  })
  /** What was sent since the last call, then forget it. */
  const take = () => sent.splice(0)
  return { s, actions, sent, settingsSent, themes, pages, take }
}

describe('onchord', () => {
  it('fingering, upper, left hold, settle and the split reach the session', () => {
    const { s, actions } = setup((st) => {
      st.chord.fingering = 'fingered'
      st.chord.upper = false
    })
    actions.onchord({ type: 'fingering', id: 'singleFinger' })
    expect(s.state.chord.fingering).toBe('singleFinger')
    actions.onchord({ type: 'upper', on: true })
    expect(s.state.chord.upper).toBe(true)
    const hold = s.state.chord.leftHold
    actions.onchord({ type: 'leftHold', on: !hold })
    expect(s.state.chord.leftHold).toBe(!hold)
    actions.onchord({ type: 'settle', ms: 20 })
    expect(s.state.chord.settleMs).toBe(20)
    actions.onchord({ type: 'split', note: 60 })
    expect(s.state.chord.split).toBe(60)
    actions.onchord({ type: 'splitStep', delta: 1 })
    expect(s.state.chord.split).toBe(61)
    actions.onchord({ type: 'splitReset' })
    expect(s.state.chord.split).toBe(54)
  })

  it('sends nothing for the fingering already chosen, or Manual Bass without Upper', () => {
    const { actions, take } = setup((st) => {
      st.chord.fingering = 'fingered'
      st.chord.upper = false
    })
    actions.onchord({ type: 'fingering', id: 'fingered' })
    actions.onchord({ type: 'manualBass', on: true })
    expect(take()).toEqual([])
  })

  it('the lock note opens the Keyboard page', () => {
    const { actions, pages, take } = setup()
    actions.onchord({ type: 'openKeyboard' })
    expect(pages).toEqual(['keyboard'])
    expect(take()).toEqual([])
  })
})

describe('onstyle', () => {
  it('a value setting sends its set command', () => {
    const { actions, take } = setup()
    actions.onstyle({ key: 'mainTiming', value: 'immediate' })
    actions.onstyle({ key: 'introEndingTiming', value: 'endOfSection' })
    actions.onstyle({ key: 'otsLinkTiming', value: 'mainChange' })
    actions.onstyle({ key: 'stopAcmp', value: 'fixed' })
    actions.onstyle({ key: 'tempoChange', value: 'hold' })
    actions.onstyle({ key: 'partsChange', value: 'reset' })
    actions.onstyle({ key: 'sectionSet', value: null })
    actions.onstyle({ key: 'syncStopWindowMs', value: 1500 })
    actions.onstyle({ key: 'fadeInMs', value: 3000 })
    actions.onstyle({ key: 'fadeOutMs', value: 4000 })
    actions.onstyle({ key: 'fadeHoldMs', value: 500 })
    actions.onstyle({ key: 'retriggerRate', value: 8 })
    actions.onstyle({ key: 'swing', value: 30 })
    actions.onstyle({ key: 'swingGrid', value: 16 })
    actions.onstyle({ key: 'sectionTempo', value: false })
    actions.onstyle({ key: 'sectionReset', value: true })
    actions.onstyle({ key: 'unisonType', value: 'melody' })
    actions.onstyle({ key: 'dynamicsControl', value: true })
    actions.onstyle({ key: 'dynamicsLevel', value: 100 })
    actions.onstyle({ key: 'accentThreshold', value: 0 })
    actions.onstyle({ key: 'accentMode', value: 'fill' })
    actions.onstyle({ key: 'accentSource', value: 'both' })
    expect(take()).toEqual([
      { type: 'setMainTiming', timing: 'immediate' },
      { type: 'setIntroEndingTiming', timing: 'endOfSection' },
      { type: 'setOtsLinkTiming', timing: 'mainChange' },
      { type: 'setStopAcmp', mode: 'fixed' },
      { type: 'setTempoChange', rule: 'hold' },
      { type: 'setPartsChange', rule: 'reset' },
      { type: 'setSectionSet', section: null },
      { type: 'setSyncStopWindow', ms: 1500 },
      { type: 'setFadeInTime', ms: 3000 },
      { type: 'setFadeOutTime', ms: 4000 },
      { type: 'setFadeHoldTime', ms: 500 },
      { type: 'setRetriggerRate', rate: 8 },
      { type: 'setSwing', amount: 30 },
      { type: 'setSwingGrid', grid: 16 },
      { type: 'setSectionTempo', on: false },
      { type: 'setSectionReset', on: true },
      { type: 'setUnisonType', unisonType: 'melody' },
      { type: 'setDynamicsControl', on: true },
      { type: 'setDynamics', level: 100 },
      { type: 'setAccentThreshold', velocity: 1 },
      { type: 'setAccentMode', mode: 'fill' },
      { type: 'setAccentSource', source: 'both' },
    ])
  })

  it('a switch sends its toggle only when the value differs from the state', () => {
    const { s, actions, take } = setup((st) => {
      st.transport.retrigger = false
      st.transport.autoFill = true
      st.transport.halfBarFill = false
      st.transport.unisonLatched = false
      st.dynamics.touch = false
      st.dynamics.accent = true
    })
    actions.onstyle({ key: 'retrigger', value: false })
    actions.onstyle({ key: 'autoFill', value: true })
    actions.onstyle({ key: 'accent', value: true })
    expect(take()).toEqual([])
    actions.onstyle({ key: 'retrigger', value: true })
    expect(s.state.transport.retrigger).toBe(true)
    actions.onstyle({ key: 'autoFill', value: false })
    expect(s.state.transport.autoFill).toBe(false)
    actions.onstyle({ key: 'halfBarFill', value: true })
    actions.onstyle({ key: 'unison', value: true })
    actions.onstyle({ key: 'touch', value: true })
    actions.onstyle({ key: 'accent', value: false })
    expect(take()).toEqual([
      { type: 'toggleRetrigger' },
      { type: 'toggleAutoFill' },
      { type: 'toggleHalfBarFill' },
      { type: 'toggleUnison' },
      { type: 'toggleDynamicsTouch' },
      { type: 'toggleAccent' },
    ])
  })

  it('Sync Stop sends nothing while it isn\'t available', () => {
    const { actions, take } = setup((st) => {
      st.transport.syncStop = false
      st.transport.syncStopAvailable = false
    })
    actions.onstyle({ key: 'syncStop', value: true })
    expect(take()).toEqual([])
  })
})

describe('onkeyboard', () => {
  it('steps, resets and locks', () => {
    const { s, actions } = setup((st) => {
      st.chord.transposeKeyboard = 0
      st.chord.transposeMaster = 0
    })
    actions.onkeyboard({ type: 'keyboardStep', delta: 1 })
    actions.onkeyboard({ type: 'masterStep', delta: -1 })
    expect([s.state.chord.transposeKeyboard, s.state.chord.transposeMaster]).toEqual([1, -1])
    actions.onkeyboard({ type: 'reset' })
    expect([s.state.chord.transposeKeyboard, s.state.chord.transposeMaster]).toEqual([0, 0])
    actions.onkeyboard({ type: 'lock', item: 'fingeringType', on: true })
    expect(s.state.paramLocks.fingeringType).toBe(true)
  })
})

describe('onpedals', () => {
  it('setPedal carries the whole pedal with the change', () => {
    const { s, actions, take } = setup()
    const p = { ...s.state.controllers.pedals[1] }
    actions.onpedals({ type: 'reverse', pedal: 1, on: !p.reverse })
    expect(take()).toEqual([{ type: 'setPedal', pedal: 1, cc: p.cc, function: p.function, controlType: p.controlType, reverse: !p.reverse, range: p.range }])
    expect(s.state.controllers.pedals[1].reverse).toBe(!p.reverse)
    actions.onpedals({ type: 'cc', pedal: 2, cc: 70 })
    expect(s.state.controllers.pedals[2].cc).toBe(70)
    actions.onpedals({ type: 'function', pedal: 0, fn: 'startStop' })
    expect(s.state.controllers.pedals[0].function).toBe('startStop')
  })

  it('Learn starts, and pressed again on the learning pedal, stops', () => {
    const { s, actions, take } = setup((st) => (st.controllers.learning = null))
    actions.onpedals({ type: 'learn', pedal: 0 })
    expect(take()).toEqual([{ type: 'learnPedal', pedal: 0 }])
    // The mock learns at once; the engine waits for a press, learning meanwhile.
    s.state.controllers.learning = 0
    actions.onpedals({ type: 'learn', pedal: 0 })
    expect(take()).toEqual([{ type: 'learnPedal', pedal: null }])
  })

  it('Try runs the pedal\'s function; nothing for none', () => {
    const { s, actions, take } = setup()
    s.state.controllers.pedals[0] = { ...s.state.controllers.pedals[0], function: 'startStop' }
    actions.onpedals({ type: 'try', pedal: 0 })
    expect(take()).toEqual([{ type: 'triggerFunction', function: 'startStop' }])
    s.state.controllers.pedals[0] = { ...s.state.controllers.pedals[0], function: 'none' }
    actions.onpedals({ type: 'try', pedal: 0 })
    expect(take()).toEqual([])
  })

  it('reach keeps the part\'s other controllers; the bend range clamps to 0–12', () => {
    const { s, actions, take } = setup((st) => (st.controllers.parts[2] = { sustain: true, pitchBend: true, modulation: false, bendRange: 12 }))
    actions.onpedals({ type: 'reach', part: 2, controller: 'sustain', on: false })
    expect(take()).toEqual([{ type: 'setPartControllers', part: 2, sustain: false, pitchBend: true, modulation: false }])
    expect(s.state.controllers.parts[2].sustain).toBe(false)
    actions.onpedals({ type: 'bendStep', part: 2, delta: 1 })
    expect(take()).toEqual([{ type: 'setBendRange', part: 2, semitones: 12 }])
    actions.onpedals({ type: 'bendStep', part: 2, delta: -1 })
    expect(s.state.controllers.parts[2].bendRange).toBe(11)
  })
})

describe('onsystem', () => {
  it('synth, output pair, buffer and master', () => {
    const { s, actions, take } = setup((st) => {
      if (st.io.synth) st.io.synth = { ...st.io.synth, muted: false, channels: 4 }
    })
    expect(s.state.io.synth).not.toBeNull()
    actions.onsystem({ type: 'synth', on: false })
    expect(s.state.io.synth?.muted).toBe(true)
    actions.onsystem({ type: 'outputPair', first: 3 })
    expect(s.state.io.synth?.outputPair).toEqual([3, 4])
    take()
    actions.onsystem({ type: 'buffer', frames: 256 })
    actions.onsystem({ type: 'buffer', frames: 100 })
    actions.onsystem({ type: 'master', volume: 90 })
    expect(take()).toEqual([
      { type: 'setAudioBuffer', frames: 256 },
      { type: 'setMasterVolume', volume: 90 },
    ])
  })

  it('MIDI inputs go through the settings adapter, naming the sources that listen', () => {
    const { actions, settingsSent } = setup((st) => {
      st.io.allInputs = true
      st.io.sources = [
        { name: 'A', listening: true, pads: false },
        { name: 'B', listening: true, pads: false },
        { name: 'C', listening: false, pads: false },
      ]
    })
    actions.onsystem({ type: 'input', name: 'B', on: false })
    expect(settingsSent.at(-1)).toEqual({ type: 'setMidiInputs', all: false, names: ['A'] })
    actions.onsystem({ type: 'input', name: 'C', on: true })
    expect(settingsSent.at(-1)?.type).toBe('setMidiInputs')
    expect((settingsSent.at(-1) as { names: string[] }).names).toContain('C')
    actions.onsystem({ type: 'allInputs', all: true })
    expect(settingsSent.at(-1)).toMatchObject({ type: 'setMidiInputs', all: true })
  })

  it('palette LEDs, rescan and the theme', () => {
    const { actions, settingsSent, themes } = setup()
    actions.onsystem({ type: 'paletteLeds', on: true })
    actions.onsystem({ type: 'rescan' })
    actions.onsystem({ type: 'theme', theme: 'light' })
    expect(settingsSent).toEqual([{ type: 'setPaletteLeds', on: true }, { type: 'rescanLibrary' }])
    expect(themes).toEqual(['light'])
  })
})

describe('onlaunchkey', () => {
  it('moves, hides, shows and resets the pad page order', () => {
    const { s, actions, take } = setup((st) => (st.settings.padPages = [...DEFAULT_PAD_PAGES]))
    actions.onlaunchkey({ type: 'move', id: 'chord', delta: -1 })
    expect(s.state.settings.padPages).toEqual(['chord', 'racks', 'multiPads', 'setup'])
    actions.onlaunchkey({ type: 'move', id: 'chord', delta: -1 })
    actions.onlaunchkey({ type: 'shown', id: 'racks', on: true })
    take()
    actions.onlaunchkey({ type: 'shown', id: 'racks', on: false })
    expect(s.state.settings.padPages).toEqual(['chord', 'multiPads', 'setup'])
    actions.onlaunchkey({ type: 'shown', id: 'racks', on: true })
    expect(s.state.settings.padPages).toEqual(['chord', 'multiPads', 'setup', 'racks'])
    actions.onlaunchkey({ type: 'reset' })
    expect(s.state.settings.padPages).toEqual(DEFAULT_PAD_PAGES)
  })

  it('a move off either end sends nothing', () => {
    const { actions, take } = setup((st) => (st.settings.padPages = [...DEFAULT_PAD_PAGES]))
    actions.onlaunchkey({ type: 'move', id: 'racks', delta: -1 })
    actions.onlaunchkey({ type: 'move', id: 'setup', delta: 1 })
    expect(take()).toEqual([])
  })
})
