// The rack helpers' tests, kept from the old Rack panel's tests (RackPanel.test.ts) when the
// Push Rack page replaced its internals; the page's own tests are a separate step.
import { describe, expect, it } from 'vitest'
import { MockSession } from '../../lib/api/mock'
import type { PartPlugin, PluginEntry } from '../../lib/api/types'
import { pluginBadge, pluginTip } from '../mixer/voice'
import { inProcessPending, pluginStatusLine } from '../parts/parts'
import { rackName, soundBadge, soundLabel, targetLabel } from './rack'

describe('rack helpers', () => {
  it('word the rack, the sounds and the controller map', () => {
    const live = { name: 'New rack', id: null, modified: false, controls: { faders: [], knobs: [] }, prompt: null }
    expect(rackName(live)).toBe('Untitled rack')
    expect(rackName({ ...live, name: 'Restored' })).toBe('Restored')
    expect(rackName({ ...live, name: 'Ballad', id: 'r1' })).toBe('Ballad')
    const s = new MockSession({ manual: true, demo: false })
    const p = s.state.keyboardParts[0]
    expect(soundLabel({ ...p, soundEdited: true })).toBe(`${p.voiceName} ●`)
    expect(soundBadge(p, 'sf:GeneralUser-GS.sf2:0:0')).toBe('SoundFont')
    expect(soundBadge(p, 'saved:warm-rhodes')).toBe('Mine')
    expect(soundBadge(p, 'au:aumu Smp7 Fake#f:1')).toBe('Factory')
    expect(targetLabel({ kind: 'partChorus', part: 3 })).toBe('Left chorus')
    expect(targetLabel({ kind: 'harmonyArp' })).toBe('Harmony/Arp on/off')
    expect(targetLabel({ kind: 'somethingNew' } as never)).toBe('Set by a newer yahaha')
  })
})

describe('plugin status', () => {
  it('In proc shows ↻ while the playing plugin still runs where it loaded (#176)', () => {
    const p = { status: 'playing', outOfProcess: true, inProcessFallback: false } as PartPlugin
    const e = (id: string, inProcess: boolean, format: 'AUv2' | 'AUv3' = 'AUv2') => ({ id, inProcess, format }) as PluginEntry
    // Turned on while it runs in its own process: pending until the next load.
    expect(inProcessPending(p, e('aumu Xf2X XFER', true))).toBe(true)
    expect(inProcessPending({ ...p, outOfProcess: false }, e('aumu Xf2X XFER', true))).toBe(false)
    // Turned off while it runs in process: its next load goes to its own process.
    expect(inProcessPending({ ...p, outOfProcess: false }, e('aumu Xf2X XFER', false))).toBe(true)
    expect(inProcessPending(p, e('aumu Xf2X XFER', false))).toBe(false)
    // An Apple AUv2 runs in process either way; a fallback is not the override's.
    expect(inProcessPending({ ...p, outOfProcess: false }, e('aumu dls  appl', false))).toBe(false)
    expect(inProcessPending({ ...p, outOfProcess: false }, e('aumu Ab3X appl', false, 'AUv3'))).toBe(true)
    expect(inProcessPending({ ...p, outOfProcess: false, inProcessFallback: true }, e('aumu Xf2X XFER', false))).toBe(false)
    // Only a playing plugin.
    expect(inProcessPending({ ...p, status: 'loading' }, e('aumu Xf2X XFER', true))).toBe(false)
    expect(inProcessPending(p, undefined)).toBe(false)
  })

  it('the mixer badge reads out the plugin\'s CPU and its slow renders of the last 10 s', () => {
    const s = new MockSession({ manual: true, demo: false })
    s.send({ type: 'setPartPlugin', part: 0, id: 'aumu dls  appl', state: null })
    s.send({ type: 'setPartPlugin', part: 1, id: 'aumu samp appl', state: null })
    s.advance(1000)
    const light = s.state.keyboardParts[0].plugin!
    expect(pluginBadge(light)).toBe('Plugin · 1% CPU')
    expect(pluginTip(light)).toBe('mixer.plugin')
    const heavy = s.state.keyboardParts[1].plugin!
    expect(pluginBadge(heavy)).toBe('4 slow · 31% CPU')
    expect(pluginTip(heavy)).toBe('mixer.plugin_overruns')
    heavy.recentOverruns = 0
    expect(pluginBadge(heavy)).toBe('Plugin · 31% CPU')
  })

  it('a plugin that fell back to loading in process says so, in the part and on the mixer badge', () => {
    const s = new MockSession({ manual: true, demo: false })
    s.send({ type: 'setPartPlugin', part: 1, id: 'aumu Tiny Demo', state: null })
    s.advance(1000)
    const p = s.state.keyboardParts[1].plugin!
    expect(p.status).toBe('playing')
    expect(p.inProcessFallback).toBe(true)
    expect(p.outOfProcess).toBe(false)
    expect(s.state.message?.text).toContain("can't run in its own process")
    expect(pluginStatusLine(p, true)).toContain('⚠ in process')
    expect(pluginBadge(p)).toMatch(/^Plugin ⚠ · \d+% CPU$/)
    s.send({ type: 'setPartPlugin', part: 1, id: 'aumu dls  appl', state: null })
    s.advance(1000)
    const q = s.state.keyboardParts[1].plugin!
    expect(q.inProcessFallback).toBe(false)
    expect(pluginStatusLine(q, true)).not.toContain('⚠')
  })
})
