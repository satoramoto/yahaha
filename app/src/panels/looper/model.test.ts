import { describe, expect, it } from 'vitest'
import { MockSession } from '../../lib/api/mock'
import type { LooperState } from '../../lib/api/types'
import { barsOf, clashes, LOCAL_CLOSED, looperChange, looperPage, playheadOf } from './model'

const banks: Pick<LooperState, 'banks' | 'bankPath'> = {
  banks: [
    { name: 'Sunday set', path: '/l/Sunday set.clb' },
    { name: 'Ballads', path: '/l/Ballads.clb' },
  ],
  bankPath: '/l/Sunday set.clb',
}

describe('looper page model', () => {
  it('lays the sequence out in bars, chords in their bar, empty bars holding', () => {
    const bars = barsOf({
      bars: 3,
      chords: [
        { bar: 1, beat: 1, chord: 'C' },
        { bar: 3, beat: 1, chord: 'Dm7' },
        { bar: 3, beat: 2.5, chord: 'G7' },
      ],
    })
    expect(bars.map((b) => b.chords.map((c) => c.chord))).toEqual([['C'], [], ['Dm7', 'G7']])
    expect(bars[2].chords[1].beat).toBe(2.5)
  })

  it('draws the playhead only while looping or recording with the band running', () => {
    expect(playheadOf({ mode: 'looping', bar: 2 }, true, 6, 4)).toBe(0.5)
    expect(playheadOf({ mode: 'recording', bar: 1 }, true, 3, 4)).toBe(0.75)
    expect(playheadOf({ mode: 'looping', bar: 2 }, false, 6, 4)).toBeNull()
    expect(playheadOf({ mode: 'loopArmed', bar: null }, true, 6, 4)).toBeNull()
    expect(playheadOf({ mode: 'off', bar: null }, true, 6, 4)).toBeNull()
  })

  it('a typed name clashes with another bank file, not with its own or an empty one', () => {
    expect(clashes(banks, 'ballads')).toBe(true)
    expect(clashes(banks, 'Sunday set')).toBe(false)
    expect(clashes(banks, '  ')).toBe(false)
    expect(clashes(banks, 'New one')).toBe(false)
  })

  it('builds the page from the state: memories summarised, the bank saved or not, the form', () => {
    const s = new MockSession({ manual: true, demo: true }).state
    s.looper.memories[1] = { name: 'CLD_002', bars: 2, chords: [{ bar: 1, beat: 1, chord: 'C' }, { bar: 2, beat: 1, chord: 'G' }] }
    s.looper.banks = banks.banks
    s.looper.bankPath = null
    const page = looperPage(s, { pick: 'store', loadOpen: true, saveAs: 'Ballads' })
    expect(page.memories[1]).toEqual({ name: 'CLD_002', bars: 2, summary: 'C G' })
    expect(page.memories[0].name).toBeNull()
    expect(page.bankSaved).toBe(false)
    expect(page.pick).toBe('store')
    expect(page.loadOpen).toBe(true)
    expect(page.saveAs).toEqual({ name: 'Ballads', clash: true })
    expect(looperPage(s, LOCAL_CLOSED).saveAs).toBeNull()
  })

  it('turns Rec / Stop, On / Off and the memory latch into commands', () => {
    expect(looperChange({ type: 'rec' }, LOCAL_CLOSED, banks).cmds).toEqual([{ type: 'looperRec' }])
    expect(looperChange({ type: 'onOff' }, LOCAL_CLOSED, banks).cmds).toEqual([{ type: 'looperOnOff' }])
    const latched = looperChange({ type: 'pick', pick: 'store' }, LOCAL_CLOSED, banks)
    expect(latched.cmds).toEqual([])
    const stored = looperChange({ type: 'memory', index: 2 }, latched.local, banks)
    expect(stored.cmds).toEqual([{ type: 'storeLooperMemory', index: 2 }])
    expect(stored.local.pick).toBeNull()
    const cleared = looperChange({ type: 'memory', index: 4 }, { ...LOCAL_CLOSED, pick: 'clear' }, banks)
    expect(cleared.cmds).toEqual([{ type: 'clearLooperMemory', index: 4 }])
    expect(looperChange({ type: 'memory', index: 0 }, LOCAL_CLOSED, banks).cmds).toEqual([{ type: 'selectLooperMemory', index: 0 }])
  })

  it('banks: New, Load from the list, Save as with a name, Overwrite only when asked', () => {
    expect(looperChange({ type: 'newBank' }, LOCAL_CLOSED, banks).cmds).toEqual([{ type: 'newLooperBank' }])
    const open = looperChange({ type: 'loadOpen', open: true }, LOCAL_CLOSED, banks).local
    expect(open.loadOpen).toBe(true)
    const loaded = looperChange({ type: 'load', path: '/l/Ballads.clb' }, open, banks)
    expect(loaded.cmds).toEqual([{ type: 'loadLooperBank', path: '/l/Ballads.clb' }])
    expect(loaded.local.loadOpen).toBe(false)

    let local = looperChange({ type: 'saveAsOpen', open: true }, open, banks).local
    expect(local).toEqual({ pick: null, loadOpen: false, saveAs: '' })
    // Empty: saves the bank under its own name.
    expect(looperChange({ type: 'save', overwrite: false }, local, banks).cmds).toEqual([{ type: 'saveLooperBank', name: null }])
    local = looperChange({ type: 'saveAsName', name: ' Ballads ' }, local, banks).local
    const refused = looperChange({ type: 'save', overwrite: false }, local, banks)
    expect(refused.cmds).toEqual([])
    expect(refused.local.saveAs).toBe(' Ballads ')
    const over = looperChange({ type: 'save', overwrite: true }, local, banks)
    expect(over.cmds).toEqual([{ type: 'saveLooperBank', name: 'Ballads', overwrite: true }])
    expect(over.local.saveAs).toBeNull()
    expect(looperChange({ type: 'saveAsOpen', open: false }, local, banks).local.saveAs).toBeNull()
  })
})
