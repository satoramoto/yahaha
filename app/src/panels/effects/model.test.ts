// The Effects page's data and commands: the pure functions from AppState to the library Effects'
// props, and from its changes to commands.

import { describe, expect, it } from 'vitest'
import { MockSession } from '../../lib/api/mock'
import type { AppState, SendState } from '../../lib/api/types'
import { busCommand, busData, effectsData, freeText, insertsCommand, listData, masterCommand, masterData, mixCommand, returnText, shownBus, typeLabel } from './model'

function mockState(edit?: (s: MockSession) => void): AppState {
  const session = new MockSession({ demo: true, manual: true })
  session.advance(16)
  edit?.(session)
  session.advance(16)
  const s = structuredClone(session.state)
  session.dispose()
  return s
}

const phaser: SendState = {
  send: 3,
  kind: 'phaser',
  name: 'Phaser',
  params: [
    { name: 'Depth', value: 64, min: 0, max: 127, default: 64, display: '64' },
    { name: 'Rate', value: 50, min: 5, max: 500, default: 50, display: '0.50 Hz' },
    { name: 'Feedback', value: 40, min: 0, max: 90, default: 40, display: '40%' },
  ],
  returnLevel: 20,
  fromStyle: false,
  setByRack: true,
}

describe('typeLabel', () => {
  it('drops the bus name from the delay types', () => {
    expect(typeLabel('Delay 1/8.')).toBe('Dotted 1/8')
    expect(typeLabel('Delay 1/8')).toBe('1/8')
    expect(typeLabel('Delay 1/4')).toBe('1/4')
    expect(typeLabel('Ping-Pong')).toBe('Ping-pong')
    expect(typeLabel('Hall')).toBe('Hall')
  })
})

describe('returnText', () => {
  it('reads a return in dB: 0 = Off, 64 = 0 dB, 127 = +6 dB', () => {
    expect(returnText(0)).toBe('Off')
    expect(returnText(64)).toBe('+0.0 dB')
    expect(returnText(127)).toBe('+6.0 dB')
    expect(returnText(32)).toBe('-6.0 dB')
    expect(returnText(100)).toBe('+3.9 dB')
  })
  it('shows the editor\'s Return and the list in dB, still set on 0–127', () => {
    const state = mockState()
    const bus = busData(state, 0)!
    const ret = bus.levels.find((l) => l.id === 'return')!
    expect([ret.min, ret.max, ret.value]).toEqual([0, 127, state.effects.blocks[0].returnLevel])
    expect(ret.display).toBe(returnText(ret.value))
    const added = busData({ ...state, effects: { ...state.effects, sends: [...(state.effects.sends ?? []), phaser] } }, 3)!
    expect(added.levels[0].display).toBe('-10.1 dB')
  })
})

describe('shownBus', () => {
  it('falls back to send 1 for a send that is not there', () => {
    expect(shownBus(4, 4)).toBe(0)
    expect(shownBus(2, 3)).toBe(2)
    expect(shownBus(-1, 3)).toBe(0)
    expect(shownBus('master', 3)).toBe('master')
    expect(shownBus('inserts', 3)).toBe('inserts')
  })
  it('lists the free sends', () => {
    expect(freeText([0, 1, 2])).toBe('4, 5 and 6 free')
    expect(freeText([0, 1, 2, 3])).toBe('5 and 6 free')
    expect(freeText([0, 1, 2, 3, 4])).toBe('6 free')
    expect(freeText([0, 1, 2, 3, 4, 5])).toBe('')
  })
})

describe('the list', () => {
  it('names sends 1–3 by their bus, the type and source below', () => {
    const s = mockState()
    const list = listData(s)
    expect(list.sends.map((r) => r.name)).toEqual(['Reverb', 'Chorus', 'Delay'])
    const reverb = s.effects.blocks[0]
    expect(list.sends[0].subtitle).toBe(`${reverb.effectName} · ${reverb.followStyle ? 'From style' : 'Mine'}`)
    expect(list.sends[0].returnLevel).toBe(reverb.returnLevel)
    expect(list.canAdd).toBe(true)
    expect(list.free).toBe('4, 5 and 6 free')
  })
  it('shows an added send by its kind and the rack badge on sends 1–3 only', () => {
    const s = mockState((m) => {
      m.send({ type: 'addSend', kind: 'phaser' })
      m.send({ type: 'setRackSendOverride', send: 0, on: true })
    })
    const list = listData(s)
    expect(list.sends[3]).toMatchObject({ send: 3, name: 'Phaser', subtitle: 'Added send', setByRack: false })
    expect(list.sends[0].setByRack).toBe(true)
    expect(list.free).toBe('5 and 6 free')
  })
  it('builds three rows from the blocks for an older state, with no Add send', () => {
    const s = mockState()
    s.effects.sends = []
    const list = listData(s)
    expect(list.sends).toHaveLength(3)
    expect(list.canAdd).toBe(false)
  })
  it('summarises the inserts and the Master', () => {
    const s = mockState()
    s.effects.inserts = [{ part: 3, partName: 'Chord 1', name: 'British Combo Classic', effect: 'distortion', on: true, amount: 64 }]
    s.effects.insertsOn = true
    s.effects.master.compressor.on = true
    s.effects.master.compressor.preset = 'punchy'
    s.effects.master.eq.on = false
    expect(listData(s).insertsLine).toBe('On · Chord 1')
    expect(listData(s).masterLine).toBe('Comp Punchy · EQ off')
    s.effects.inserts = []
    expect(listData(s).insertsLine).toBe('None in this style')
  })
})

describe('a send editor', () => {
  it('draws the delay: sync and rack switches, Note or Time on K5, then the levels', () => {
    const s = mockState((m) => m.send({ type: 'setEffectParam', block: 'variation', param: 'delaySync', value: 1 }))
    const bus = busData(s, 2)!
    expect(bus.name).toBe('Delay')
    expect(bus.switches.map((x) => x.id)).toEqual(['delaySync', 'pingPong', 'rack'])
    expect(bus.params[0]).toMatchObject({ id: 'delayNote', code: 'K5', tip: 'fx.param.delay_note' })
    expect(bus.params.map((p) => p.id)).not.toContain('delayTime')
    expect(bus.levels.map((l) => [l.id, l.code])).toEqual([['return', 'K8'], ['band', ''], ['pad', '']])
    expect(bus.note).toContain('Knob page 6/6, Delay, moves K1 to K8.')
    const off = busData(mockState((m) => m.send({ type: 'setEffectParam', block: 'variation', param: 'delaySync', value: 0 })), 2)!
    expect(off.params[0]).toMatchObject({ id: 'delayTime', code: 'K5' })
  })
  it('reads each keyboard part\'s send to the bus from its strip', () => {
    const s = mockState()
    s.keyboardParts[1].strip.sends[2] = 16
    const bus = busData(s, 2)!
    expect(bus.parts[1]).toMatchObject({ tag: 'R2', hue: 'r2', value: 16 })
  })
  it('draws an added send: a kind picker, its own parameters, Return only, no codes', () => {
    const s = mockState()
    s.effects.sends = [...s.effects.sends, phaser]
    const bus = busData(s, 3)!
    expect(bus.styleBus).toBe(false)
    expect(bus.types).toHaveLength(12)
    expect(bus.params.map((p) => [p.id, p.label, p.code])).toEqual([['p0', 'Depth', ''], ['p1', 'Rate', ''], ['p2', 'Feedback', '']])
    expect(bus.levels.map((l) => l.id)).toEqual(['return'])
    expect(bus.note).toBe('Saved with the rack. No knob page moves it.')
  })
  it('opens send 1 when the open send is gone', () => {
    const data = effectsData(mockState(), 5)
    expect(data.bus).toBe(0)
    expect(data.editor?.name).toBe('Reverb')
  })
})

describe('commands', () => {
  it('turns a send editor\'s changes into commands', () => {
    expect(busCommand({ type: 'source', send: 2, follow: true })).toEqual({ type: 'setFollowStyle', block: 'variation', on: true })
    expect(busCommand({ type: 'kind', send: 2, kind: 'pingPong' })).toEqual({ type: 'setEffectType', block: 'variation', effect: 'pingPong' })
    expect(busCommand({ type: 'kind', send: 3, kind: 'room' })).toEqual({ type: 'setSendKind', send: 3, kind: 'room' })
    expect(busCommand({ type: 'switch', send: 2, id: 'delaySync', on: false })).toEqual({ type: 'setEffectParam', block: 'variation', param: 'delaySync', value: 0 })
    expect(busCommand({ type: 'switch', send: 1, id: 'rack', on: true })).toEqual({ type: 'setRackSendOverride', send: 1, on: true })
    expect(busCommand({ type: 'param', send: 2, id: 'delayFeedback', value: 39 })).toEqual({ type: 'setEffectParam', block: 'variation', param: 'delayFeedback', value: 39 })
    expect(busCommand({ type: 'param', send: 2, id: 'return', value: 64 })).toEqual({ type: 'setEffectReturn', block: 'variation', level: 64 })
    expect(busCommand({ type: 'param', send: 2, id: 'band', value: 5 })).toEqual({ type: 'setBandSend', block: 'variation', level: 5 })
    expect(busCommand({ type: 'param', send: 0, id: 'pad', value: 90 })).toEqual({ type: 'setPadSend', block: 'reverb', level: 90 })
    expect(busCommand({ type: 'param', send: 3, id: 'p1', value: 60 })).toEqual({ type: 'setSendParam', send: 3, param: 1, value: 60 })
    expect(busCommand({ type: 'param', send: 3, id: 'return', value: 30 })).toEqual({ type: 'setSendReturn', send: 3, level: 30 })
    expect(busCommand({ type: 'partSend', send: 2, part: 1, value: 17 })).toEqual({ type: 'setStripSend', strip: 1, send: 2, level: 17 })
    expect(busCommand({ type: 'remove', send: 3 })).toEqual({ type: 'removeSend', send: 3 })
  })
  it('turns the Master, inserts and mix changes into commands', () => {
    expect(masterCommand({ type: 'compType', preset: 'punchy' })).toEqual({ type: 'setMasterCompressorPreset', preset: 'punchy' })
    expect(masterCommand({ type: 'compParam', id: 'texture', value: 51 })).toEqual({ type: 'setMasterCompressorParam', param: 'texture', value: 51 })
    expect(masterCommand({ type: 'eqType', preset: 'loudness' })).toEqual({ type: 'setMasterEqPreset', preset: 'loudness' })
    expect(masterCommand({ type: 'eqBand', band: 0, gain: 1, freq: 80, q: 7, shelf: true })).toEqual({ type: 'setMasterEqBand', band: 0, gain: 1, freq: 80, q: 7, shelf: true })
    expect(masterCommand({ type: 'eqBand', band: 3, gain: 0, freq: 1234, q: 7, shelf: false })).toEqual({ type: 'setMasterEqBand', band: 3, gain: 0, freq: 1234, q: 7, shelf: false })
    expect(insertsCommand({ type: 'on', part: 3, on: false })).toEqual({ type: 'setPartInsertOn', part: 3, on: false })
    expect(insertsCommand({ type: 'amount', part: 3, amount: 65 })).toEqual({ type: 'setPartInsertAmount', part: 3, amount: 65 })
    expect(mixCommand({ type: 'insertsOn', on: false })).toEqual({ type: 'setInsertsOn', on: false })
    expect(mixCommand({ type: 'rotaryFast' })).toEqual({ type: 'toggleRotaryFast' })
    expect(mixCommand({ type: 'compOn', on: true })).toEqual({ type: 'setMasterCompressorOn', on: true })
    expect(mixCommand({ type: 'eqOn', on: true })).toEqual({ type: 'setMasterEqOn', on: true })
  })
  it('gives the Master editor the eight bands with their documented frequency ranges', () => {
    const m = masterData(mockState())
    expect(m.bands).toHaveLength(8)
    expect(m.bands[0].canShelf).toBe(true)
    expect(m.bands[3].canShelf).toBe(false)
    expect(m.bands.map((b) => [b.freqMin, b.freqMax])).toEqual([[32, 2000], [100, 10000], [100, 10000], [100, 10000], [100, 10000], [100, 10000], [100, 10000], [500, 16000]])
    for (const b of m.bands) expect(b.freq).toBeGreaterThanOrEqual(b.freqMin)
    expect(m.comp.map((r) => r.id)).toEqual(['compression', 'texture', 'output'])
  })
})
