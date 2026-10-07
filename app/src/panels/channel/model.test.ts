// The Channel page's wiring model: AppState → ChannelData, and each ChannelChange → its command
// (docs/specs/push/Channel.md, Groups A–D and States).

import { describe, expect, it } from 'vitest'
import { emptyState } from '../../lib/api/constants'
import { MockSession } from '../../lib/api/mock'
import type { AppState, Meters, PartPlugin, PatchInfo, SendState } from '../../lib/api/types'
import { SEND_KINDS } from '../effects/sendKinds'
import { channelCommand, channelData } from './model'

const send = (i: number, name: string): SendState => ({ send: i, kind: 'hall', name, params: [], returnLevel: 64, fromStyle: i < 3, setByRack: false })

const plugin = (over: Partial<PartPlugin> = {}): PartPlugin => ({
  id: 'aumu:smpd:fake',
  name: 'Sampler Deluxe',
  manufacturer: 'Fake',
  status: 'playing',
  stage: null,
  error: null,
  outOfProcess: true,
  inProcessFallback: false,
  cpu: 0,
  overruns: 0,
  recentOverruns: 0,
  editor: true,
  missing: false,
  ...over,
})

const patch = (id: string, number: number, source: PatchInfo['source']): PatchInfo => ({
  id,
  number,
  name: id,
  category: 'piano',
  tags: [],
  favourite: false,
  source,
  available: true,
  note: null,
} as PatchInfo)

/** The dev mock's state, with a realistic channel set up on it. */
function state(edit?: (s: AppState) => void): AppState {
  const session = new MockSession({ manual: true })
  session.advance(16)
  const s = session.state
  s.keyboardParts[0] = { ...s.keyboardParts[0], on: true, sounding: true, volume: 100, pan: 60, octave: 0, voiceName: 'Grand Piano', sound: { id: 'saved:p1', name: 'Stage Grand' } }
  // No sound tag: the names fall back to the GM voice.
  s.keyboardParts[1] = { ...s.keyboardParts[1], on: true, sounding: true, voiceName: 'Strings', sound: undefined, plugin: undefined }
  s.keyboardParts[2] = { ...s.keyboardParts[2], on: false, sounding: false, voiceName: 'Brass Section', sound: undefined, plugin: undefined }
  s.keyboardParts[3] = { ...s.keyboardParts[3], on: false, sounding: true, playsBass: true, voiceName: 'Finger Bass', sound: undefined, plugin: undefined }
  s.mixer.styleParts.forEach((p, i) => {
    p.on = i !== 1
    p.voice = { bankMsb: 0, bankLsb: 0, program: 0, kit: i === 0, label: `Voice ${i}` }
  })
  s.mixer.partSolo = null
  s.mixer.styleSolo = null
  s.effects.sends = [send(0, 'Hall'), send(1, 'Chorus'), send(2, 'Delay 1/8'), send(3, 'Phaser')]
  s.effects.rotaryFast = false
  s.surface.layer = { type: 'none' }
  s.soundLibrary.patches = [patch('p1', 7, { kind: 'soundFont', file: 'a.sf2', bank: 0, program: 0 }), patch('p2', 8, { kind: 'soundFont', file: 'a.sf2', bank: 0, program: 48 })]
  s.controllers.parts.forEach((p) => (p.bendRange = 2))
  edit?.(s)
  return s
}

const meters = (channels: { channel: number; cpu: number }[]): Meters => ({
  atMs: 0,
  channels: channels.map((c) => ({ ...c, peak: 0, rms: 0, cpuPeak: c.cpu })),
  master: [0, 0],
  masterRms: [0, 0],
  clips: 0,
  cpu: { total: 0, peak: 0, bufferUs: 0 },
})

const data = (s: AppState, part: number, m: Meters | null = null) => channelData({ state: s, meters: m, part, tab: 'mix' })

describe('channelData: the parts list', () => {
  it('lists the four keyboard parts then the eight Style parts, with tags, names, hues and off', () => {
    const s = state()
    const d = data(s, 0)
    expect(d.parts).toHaveLength(12)
    expect(d.parts.slice(0, 4)).toEqual([
      { tag: 'R1', name: 'Stage Grand', hue: 'r1', off: false },
      { tag: 'R2', name: 'Strings', hue: 'r2', off: false },
      { tag: 'R3', name: 'Brass Section', hue: 'r3', off: true },
      // Left under Manual Bass sounds: drawn as sounding.
      { tag: 'L', name: 'Finger Bass', hue: 'l', off: false },
    ])
    expect(d.parts.slice(4).map((p) => p.tag)).toEqual(s.mixer.styleParts.map((p) => p.name))
    expect(d.parts[4]).toEqual({ tag: s.mixer.styleParts[0].name, name: '', hue: null, off: false })
    expect(d.parts[5].off).toBe(true)
  })

  it('names the neighbours for ◀ ▶, wrapping at both ends', () => {
    const s = state()
    expect(data(s, 0).prevTag).toBe(s.mixer.styleParts[7].name)
    expect(data(s, 0).nextTag).toBe('R2')
    expect(data(s, 3).nextTag).toBe(s.mixer.styleParts[0].name)
    expect(data(s, 11).nextTag).toBe('R1')
  })
})

describe('channelData: a keyboard part', () => {
  it('reads the header, the sound, the mix and the play rows', () => {
    const s = state((s) => (s.mixer.partSolo = 0))
    const d = data(s, 0)
    expect(d).toMatchObject({ part: 0, keyboard: true, partName: 'Right 1', hue: 'r1', tab: 'mix' })
    expect(d.sound).toMatchObject({ number: '7', name: 'Stage Grand', mine: true, plugin: null, off: false, edited: false, failed: false, missing: false })
    expect(d.mix).toEqual({ level: 100, waiting: false, pan: 60, on: true, onLabel: 'On', canSwap: true, solo: true })
    expect(d.play).toEqual({ mono: false, portamento: { on: false, time: 0 }, octave: 0, bend: 2 })
    expect(d.tone).toEqual(s.keyboardParts[0].strip.tone)
  })

  it('an off part shows "off"; one silenced by another\'s solo does not', () => {
    const s = state()
    expect(data(s, 2).sound.off).toBe(true)
    expect(data(s, 2).mix).toMatchObject({ on: false, onLabel: 'Off' })
    s.keyboardParts[1].sounding = false
    expect(data(s, 1).sound.off).toBe(false)
    expect(data(s, 1).mix).toMatchObject({ on: false, onLabel: 'On' })
  })

  it('a Mine sound from the library\'s own patch, and none for an unknown one', () => {
    const s = state((s) => {
      s.keyboardParts[1].sound = { id: 'sf:a.sf2:0:48', name: 'Strings' }
      s.keyboardParts[2].sound = { id: 'sf:b.sf2:0:1', name: 'Brass' }
    })
    expect(data(s, 1).sound).toMatchObject({ mine: true, number: '' })
    expect(data(s, 2).sound.mine).toBe(false)
  })

  it('reads "Swap" while this part\'s swap is held', () => {
    const s = state((s) => (s.surface.layer = { type: 'swap', part: 0 }))
    expect(data(s, 0).mix.onLabel).toBe('Swap')
    expect(data(s, 1).mix.onLabel).toBe('On')
  })

  it('the plugin line: status, in process, the fallback, missing and failed', () => {
    const s = state((s) => (s.keyboardParts[1].plugin = plugin({ outOfProcess: false, inProcessFallback: true })))
    expect(data(s, 1).sound.plugin).toEqual({ name: 'Sampler Deluxe', status: 'playing', missing: false, inProcess: true, fallback: true, editor: true })
    s.keyboardParts[1].plugin = plugin({ status: 'failed' })
    expect(data(s, 1).sound).toMatchObject({ failed: true, missing: false, plugin: { inProcess: false, fallback: false } })
    s.keyboardParts[1].plugin = plugin({ status: 'failed', missing: true })
    expect(data(s, 1).sound).toMatchObject({ failed: false, missing: true })
  })

  it('CPU from the meters entry on the part\'s channel; null without one', () => {
    const s = state()
    const m = meters([{ channel: s.keyboardParts[1].channel, cpu: 0.12 }, { channel: 9, cpu: 0.3 }])
    expect(data(s, 1, m).cpu).toBe(0.12)
    expect(data(s, 0, m).cpu).toBeNull()
    expect(data(s, 0, null).cpu).toBeNull()
    expect(data(s, 4, m).cpu).toBe(0.3)
  })

  it('the bend range is null without a controllers entry', () => {
    const s = state((s) => (s.controllers.parts = []))
    expect(data(s, 0).play!.bend).toBeNull()
  })
})

describe('channelData: sends, groups and globals', () => {
  it('six send rows, present by the entries\' `send` field, labelled by bus or kind', () => {
    const s = state((s) => {
      s.effects.sends = [send(0, 'Hall'), send(2, 'Delay 1/8'), send(1, 'Chorus'), send(4, 'Plate')]
      s.keyboardParts[0].strip.sends = [40, 10, 0, 20, 30, 5]
    })
    expect(data(s, 0).sends).toEqual([
      { send: 0, label: 'Reverb', level: 40, present: true },
      { send: 1, label: 'Chorus', level: 10, present: true },
      { send: 2, label: 'Delay', level: 0, present: true },
      { send: 3, label: 'Send 4', level: 0, present: false },
      { send: 4, label: 'Plate', level: 30, present: true },
      { send: 5, label: 'Send 6', level: 0, present: false },
    ])
  })

  it('offers the send kinds until six sends exist', () => {
    const s = state()
    expect(data(s, 0).sendKinds.map((k) => k.kind)).toEqual(SEND_KINDS.map((k) => k.kind))
    s.effects.sends = [0, 1, 2, 3, 4, 5].map((i) => send(i, `S${i}`))
    expect(data(s, 0).sendKinds).toEqual([])
  })

  it('EQ, compressor, inserts and rotary from the strip and effects', () => {
    const s = state((s) => {
      const st = s.keyboardParts[0].strip
      st.eq = { lowGain: 2, lowFreq: 100, highGain: -1, highFreq: 8000 }
      st.inserts[0] = { kind: 'rotary', name: 'Rotary', on: true, settings: [{ name: 'Depth', value: 64, min: 0, max: 127, default: 64, display: '64' }] }
      s.effects.rotaryFast = true
    })
    const d = data(s, 0)
    expect(d.eq).toEqual({ lowGain: 2, lowFreq: 100, highGain: -1, highFreq: 8000 })
    expect(d.comp).toEqual(s.keyboardParts[0].strip.comp)
    expect(d.inserts[0]).toEqual({ kind: 'rotary', name: 'Rotary', on: true, settings: [{ name: 'Depth', value: 64, min: 0, max: 127, default: 64, display: '64' }] })
    expect(d.inserts[1]).toEqual({ kind: 'none', name: 'None', on: false, settings: [] })
    expect(d.insertKinds[0]).toEqual({ kind: 'none', name: 'None' })
    expect(d.rotaryFast).toBe(true)
  })
})

describe('channelData: a Style part', () => {
  it('reads its strip, level and lamp; no pan, tone or play; the voice as the sound', () => {
    const s = state((s) => {
      s.mixer.styleParts[1].volume = 58
      s.mixer.styleParts[1].waiting = true
      s.mixer.styleSolo = 1
      s.mixer.styleParts[1].strip.sends = [12, 0, 0, 0, 0, 0]
    })
    const d = data(s, 5)
    expect(d).toMatchObject({ part: 5, keyboard: false, partName: s.mixer.styleParts[1].name, hue: null, tone: null, play: null })
    expect(d.mix).toEqual({ level: 58, waiting: true, pan: null, on: false, onLabel: 'Off', canSwap: false, solo: true })
    expect(d.sound).toEqual({ number: '', name: 'Voice 1', edited: false, missing: false, failed: false, off: true, bass: false, mine: false, plugin: null })
    expect(d.sends[0].level).toBe(12)
    s.mixer.styleParts[1].voice = null
    expect(data(s, 5).sound.name).toBe('')
  })
})

describe('channelData: a missing or out-of-range part', () => {
  it('wraps the part number and reads a fresh state\'s part when the state lacks it', () => {
    const s = state()
    expect(data(s, 12).part).toBe(0)
    expect(data(s, -1).part).toBe(11)
    expect(data(s, 1.5).part).toBe(0)
    const bare = emptyState()
    bare.keyboardParts = []
    bare.mixer.styleParts = []
    expect(() => data(bare, 2)).not.toThrow()
    expect(() => data(bare, 7)).not.toThrow()
    expect(data(bare, 2).partName).toBe('Right 3')
  })
})

describe('channelCommand', () => {
  const cmd = (s: AppState, part: number, change: Parameters<typeof channelCommand>[2]) => channelCommand(s, part, change)

  it('level, pan, on, swap and solo for a keyboard part', () => {
    const s = state()
    expect(cmd(s, 1, { type: 'level', value: 90 })).toEqual({ type: 'setPartVolume', part: 1, volume: 90 })
    expect(cmd(s, 1, { type: 'pan', value: 30 })).toEqual({ type: 'setPartPan', part: 1, pan: 30 })
    expect(cmd(s, 1, { type: 'on' })).toEqual({ type: 'togglePart', part: 1 })
    expect(cmd(s, 1, { type: 'swap' })).toEqual({ type: 'setLayer', layer: { type: 'swap', part: 1 } })
    expect(cmd(s, 1, { type: 'solo' })).toEqual({ type: 'setPartSolo', part: 1 })
    s.mixer.partSolo = 1
    expect(cmd(s, 1, { type: 'solo' })).toEqual({ type: 'setPartSolo', part: null })
    s.surface.layer = { type: 'swap', part: 1 }
    expect(cmd(s, 1, { type: 'on' })).toEqual({ type: 'setLayer', layer: { type: 'none' } })
    expect(cmd(s, 0, { type: 'on' })).toEqual({ type: 'togglePart', part: 0 })
  })

  it('level, on and solo for a Style part; no pan, swap, tone or play', () => {
    const s = state()
    expect(cmd(s, 6, { type: 'level', value: 80 })).toEqual({ type: 'setStylePartVolume', part: 2, volume: 80 })
    expect(cmd(s, 6, { type: 'on' })).toEqual({ type: 'toggleStylePart', part: 2 })
    expect(cmd(s, 6, { type: 'solo' })).toEqual({ type: 'setStyleSolo', part: 2 })
    s.mixer.styleSolo = 2
    expect(cmd(s, 6, { type: 'solo' })).toEqual({ type: 'setStyleSolo', part: null })
    expect(cmd(s, 6, { type: 'pan', value: 10 })).toBeNull()
    expect(cmd(s, 6, { type: 'swap' })).toBeNull()
    expect(cmd(s, 6, { type: 'tone', control: 'cutoff', value: 70 })).toBeNull()
    expect(cmd(s, 6, { type: 'mono' })).toBeNull()
    expect(cmd(s, 6, { type: 'portamento', time: 10 })).toBeNull()
    expect(cmd(s, 6, { type: 'portamentoOn' })).toBeNull()
    expect(cmd(s, 6, { type: 'octave', step: 1 })).toBeNull()
    expect(cmd(s, 6, { type: 'bend', step: 1 })).toBeNull()
    // The strip commands use the strip number, 0–11.
    expect(cmd(s, 6, { type: 'send', send: 0, value: 5 })).toEqual({ type: 'setStripSend', strip: 6, send: 0, level: 5 })
    expect(cmd(s, 6, { type: 'insertOn', slot: 0 })).toEqual({ type: 'setStripInsertOn', strip: 6, slot: 0, on: true })
  })

  it('sends: only to a send that exists; add send', () => {
    const s = state()
    expect(cmd(s, 0, { type: 'send', send: 3, value: 20 })).toEqual({ type: 'setStripSend', strip: 0, send: 3, level: 20 })
    expect(cmd(s, 0, { type: 'send', send: 4, value: 20 })).toBeNull()
    expect(cmd(s, 0, { type: 'addSend', kind: 'plate' })).toEqual({ type: 'addSend', kind: 'plate' })
  })

  it('EQ keeps the other fields; tone, mono and portamento', () => {
    const s = state((s) => {
      s.keyboardParts[2].strip.eq = { lowGain: 3, lowFreq: 80, highGain: 0, highFreq: 10000 }
      s.keyboardParts[2].strip.mono = true
    })
    expect(cmd(s, 2, { type: 'eq', field: 'highGain', value: -4 })).toEqual({ type: 'setStripEq', strip: 2, eq: { lowGain: 3, lowFreq: 80, highGain: -4, highFreq: 10000 } })
    expect(cmd(s, 2, { type: 'tone', control: 'resonance', value: 70 })).toEqual({ type: 'setStripTone', strip: 2, control: 'resonance', value: 70 })
    expect(cmd(s, 2, { type: 'mono' })).toEqual({ type: 'setStripMono', strip: 2, on: false })
  })

  it('portamento: the switch keeps the time, the time keeps the switch', () => {
    const off = state((s) => {
      s.keyboardParts[2].strip.portamento = { on: false, time: 40 }
    })
    // Changing the time of an off strip doesn't turn it on.
    expect(cmd(off, 2, { type: 'portamento', time: 30 })).toEqual({ type: 'setStripPortamento', strip: 2, on: false, time: 30 })
    // Turning it on keeps its time.
    expect(cmd(off, 2, { type: 'portamentoOn' })).toEqual({ type: 'setStripPortamento', strip: 2, on: true, time: 40 })
    const on = state((s) => {
      s.keyboardParts[2].strip.portamento = { on: true, time: 40 }
    })
    // Turning it off keeps its time; a time of 0 leaves it on.
    expect(cmd(on, 2, { type: 'portamentoOn' })).toEqual({ type: 'setStripPortamento', strip: 2, on: false, time: 40 })
    expect(cmd(on, 2, { type: 'portamento', time: 0 })).toEqual({ type: 'setStripPortamento', strip: 2, on: true, time: 0 })
  })

  it('octave and bend step, and send nothing at their ends', () => {
    const s = state()
    expect(cmd(s, 0, { type: 'octave', step: 1 })).toEqual({ type: 'setPartOctave', part: 0, octave: 1 })
    s.keyboardParts[0].octave = 2
    expect(cmd(s, 0, { type: 'octave', step: 1 })).toBeNull()
    s.keyboardParts[0].octave = -2
    expect(cmd(s, 0, { type: 'octave', step: -1 })).toBeNull()
    expect(cmd(s, 0, { type: 'octave', step: 1 })).toEqual({ type: 'setPartOctave', part: 0, octave: -1 })
    expect(cmd(s, 0, { type: 'bend', step: -1 })).toEqual({ type: 'setBendRange', part: 0, semitones: 1 })
    s.controllers.parts[0].bendRange = 0
    expect(cmd(s, 0, { type: 'bend', step: -1 })).toBeNull()
    s.controllers.parts[0].bendRange = 12
    expect(cmd(s, 0, { type: 'bend', step: 1 })).toBeNull()
    expect(cmd(s, 0, { type: 'bend', step: -1 })).toEqual({ type: 'setBendRange', part: 0, semitones: 11 })
  })

  it('compressor, inserts and rotary', () => {
    const s = state((s) => {
      s.keyboardParts[0].strip.comp.on = true
      s.keyboardParts[0].strip.inserts[0] = { kind: 'rotary', name: 'Rotary', on: true, settings: [] }
    })
    expect(cmd(s, 0, { type: 'compOn' })).toEqual({ type: 'setStripCompressorOn', strip: 0, on: false })
    expect(cmd(s, 0, { type: 'compPreset', preset: 'punchy' })).toEqual({ type: 'setStripCompressorPreset', strip: 0, preset: 'punchy' })
    expect(cmd(s, 0, { type: 'compParam', param: 'ratio', value: 40 })).toEqual({ type: 'setStripCompressorParam', strip: 0, param: 'ratio', value: 40 })
    expect(cmd(s, 0, { type: 'insertKind', slot: 0, kind: 'phaser' })).toEqual({ type: 'setStripInsertKind', strip: 0, slot: 0, kind: 'phaser' })
    expect(cmd(s, 0, { type: 'insertKind', slot: 0, kind: 'rotary' })).toBeNull()
    expect(cmd(s, 0, { type: 'insertKind', slot: 1, kind: 'none' })).toBeNull()
    expect(cmd(s, 0, { type: 'insertOn', slot: 0 })).toEqual({ type: 'setStripInsertOn', strip: 0, slot: 0, on: false })
    expect(cmd(s, 0, { type: 'insertSetting', slot: 0, setting: 1, value: 9 })).toEqual({ type: 'setStripInsertSetting', strip: 0, slot: 0, setting: 1, value: 9 })
    expect(cmd(s, 0, { type: 'rotaryFast' })).toEqual({ type: 'toggleRotaryFast' })
  })
})
