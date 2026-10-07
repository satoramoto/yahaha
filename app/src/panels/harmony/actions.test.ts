// The Harm/Arp page's changes as commands, and the no-ops that send nothing.

import { describe, expect, it } from 'vitest'
import { initialHarmonyArp } from '../../lib/api/mock-harmony'
import type { HarmonyArpState } from '../../lib/api/types'
import { harmArpCommand } from './actions'

function state(edit: Partial<HarmonyArpState> = {}): HarmonyArpState {
  return { ...initialHarmonyArp(), ...edit }
}

describe('harmArpCommand', () => {
  it('picks a type or pattern; the selected one again is a no-op', () => {
    const h = state({ mode: 'harmony', harmonyType: 3, arpPattern: 5 })
    expect(harmArpCommand({ type: 'pick', group: 'harmony', index: 3 }, h)).toBeNull()
    expect(harmArpCommand({ type: 'pick', group: 'harmony', index: 4 }, h)).toEqual({ type: 'setHarmonyType', index: 4 })
    // The kept pattern isn't selected while a Harmony type is.
    expect(harmArpCommand({ type: 'pick', group: 'arpeggio', index: 5 }, h)).toEqual({ type: 'setArpPattern', index: 5 })
    const a = state({ mode: 'arpeggio', harmonyType: 3, arpPattern: 5 })
    expect(harmArpCommand({ type: 'pick', group: 'arpeggio', index: 5 }, a)).toBeNull()
    expect(harmArpCommand({ type: 'pick', group: 'harmony', index: 3 }, a)).toEqual({ type: 'setHarmonyType', index: 3 })
  })

  it('assign compares with the state, so an arpeggio’s Auto replaces a Multi', () => {
    expect(harmArpCommand({ type: 'assign', assign: 'auto' }, state())).toBeNull()
    expect(harmArpCommand({ type: 'assign', assign: 'right2' }, state())).toEqual({ type: 'setHarmonyAssign', assign: 'right2' })
    const a = state({ mode: 'arpeggio', assign: 'multi' })
    expect(harmArpCommand({ type: 'assign', assign: 'auto' }, a)).toEqual({ type: 'setHarmonyAssign', assign: 'auto' })
  })

  it('speed and quantize: the current value is a no-op', () => {
    const h = state({ speed: '1/8' })
    expect(harmArpCommand({ type: 'speed', speed: '1/8' }, h)).toBeNull()
    expect(harmArpCommand({ type: 'speed', speed: '1/32' }, h)).toEqual({ type: 'setHarmonySpeed', speed: '1/32' })
    expect(harmArpCommand({ type: 'quantize', quantize: 'off' }, h)).toBeNull()
    expect(harmArpCommand({ type: 'quantize', quantize: 'sixteenth' }, h)).toEqual({ type: 'setArpQuantize', quantize: 'sixteenth' })
  })

  it('velocity: a no-op only when mode and value are both unchanged; the value is clamped', () => {
    const h = state()
    expect(harmArpCommand({ type: 'velocity', mode: 'original', velocity: 100 }, h)).toBeNull()
    expect(harmArpCommand({ type: 'velocity', mode: 'fixed', velocity: 100 }, h)).toEqual({ type: 'setArpVelocity', mode: 'fixed', velocity: 100 })
    expect(harmArpCommand({ type: 'velocity', mode: 'original', velocity: 400 }, h)).toEqual({ type: 'setArpVelocity', mode: 'original', velocity: 127 })
    expect(harmArpCommand({ type: 'velocity', mode: 'fixed', velocity: 0 }, h)).toEqual({ type: 'setArpVelocity', mode: 'fixed', velocity: 1 })
  })

  it('clamps and rounds the volume and touch limit', () => {
    const h = state()
    expect(harmArpCommand({ type: 'volume', volume: 64.6 }, h)).toEqual({ type: 'setHarmonyVolume', volume: 65 })
    expect(harmArpCommand({ type: 'volume', volume: -3 }, h)).toEqual({ type: 'setHarmonyVolume', volume: 0 })
    expect(harmArpCommand({ type: 'volume', volume: 300 }, h)).toEqual({ type: 'setHarmonyVolume', volume: 127 })
    expect(harmArpCommand({ type: 'touchLimit', velocity: 0 }, h)).toEqual({ type: 'setTouchLimit', velocity: 1 })
    expect(harmArpCommand({ type: 'touchLimit', velocity: 200 }, h)).toEqual({ type: 'setTouchLimit', velocity: 127 })
  })

  it('the switches send their commands', () => {
    const h = state()
    expect(harmArpCommand({ type: 'on', on: true }, h)).toEqual({ type: 'setHarmonyArpOn', on: true })
    expect(harmArpCommand({ type: 'hold', on: true }, h)).toEqual({ type: 'setArpHold', on: true })
    expect(harmArpCommand({ type: 'pedalHold', on: false }, h)).toEqual({ type: 'setArpPedalHold', on: false })
    expect(harmArpCommand({ type: 'keepKeyOn', on: true }, h)).toEqual({ type: 'setArpKeepKeyOn', on: true })
    expect(harmArpCommand({ type: 'chordNoteOnly', on: true }, h)).toEqual({ type: 'setChordNoteOnly', on: true })
  })
})
