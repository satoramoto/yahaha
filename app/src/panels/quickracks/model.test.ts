// The Quick Racks page's model (model.ts): the page's props from state, and the commands its
// controls send.

import { describe, expect, it } from 'vitest'
import { MockSession } from '../../lib/api/mock'
import type { AppState } from '../../lib/api/types'
import { bankCmds, clearCmd, otsRackCmd, quickRacksView, saveCmd, slotCmd, storeCmd, timingCmd } from './model'

/** Mock state with racks stored: Ballad on A1 (loaded), Strings on A3, a gone rack on A5. */
function stateWithRacks(): AppState {
  const s = new MockSession({ demo: true, manual: true })
  const store = (slot: number, name: string, program: number) => {
    s.send({ type: 'setPartVoice', part: 0, program })
    s.send({ type: 'toggleQuickRackStore' })
    s.send({ type: 'pressQuickRack', slot })
    s.send({ type: 'saveRackAs', name })
  }
  store(2, 'Strings', 40)
  store(0, 'Ballad', 1)
  const st = structuredClone(s.state)
  st.quickRacks.buttons[4] = { rack: 'gone', name: 'Old organ', missing: true, loaded: false }
  return st
}

describe('quickRacksView', () => {
  it('draws each slot by its state, with its code and tooltip', () => {
    const v = quickRacksView(stateWithRacks(), null)
    expect(v.slots.map((s) => [s.code, s.state, s.name])).toEqual([
      ['A1', 'loaded', 'Ballad'],
      ['A2', 'empty', ''],
      ['A3', 'stored', 'Strings'],
      ['A4', 'empty', ''],
      ['A5', 'missing', 'Old organ'],
      ['A6', 'empty', ''],
      ['A7', 'empty', ''],
      ['A8', 'empty', ''],
    ])
    expect(v.slots.map((s) => s.tip)).toEqual([1, 2, 3, 4, 5, 6, 7, 8].map((n) => `quick.${n}`))
    expect(v).toMatchObject({ bank: 0, bankCount: 8, lit: 'A1', store: false, readOnly: false, waiting: null })
  })

  it('marks the loaded slot modified only while the live rack is', () => {
    const st = stateWithRacks()
    expect(quickRacksView(st, null).slots[0].modified).toBe(false)
    st.liveRack.modified = true
    const v = quickRacksView(st, null)
    expect(v.slots[0].modified).toBe(true)
    expect(v.slots[2].modified).toBe(false)
  })

  it('names the bank on view in the codes and Lit; nothing lit is empty', () => {
    const st = stateWithRacks()
    st.quickRacks.bank = 3
    st.quickRacks.buttons.forEach((b) => (b.loaded = false))
    const v = quickRacksView(st, null)
    expect(v.slots[7].code).toBe('D8')
    expect(v.lit).toBe('')
  })

  it('a waiting Store: the slot waits, and the foot asks; a never-saved rack asks its name', () => {
    const st = stateWithRacks()
    st.quickRacks.store = true
    st.quickRacks.storeWaiting = 5
    st.liveRack.modified = true
    let v = quickRacksView(st, null)
    expect(v.slots[5].waiting).toBe(true)
    expect(v.slots.filter((s) => s.waiting)).toHaveLength(1)
    expect(v.waiting).toEqual({ code: 'A6', rack: 'Ballad', needsName: false, name: 'Ballad' })
    st.liveRack.id = null
    st.liveRack.name = 'New rack'
    v = quickRacksView(st, 'Late night')
    expect(v.waiting).toEqual({ code: 'A6', rack: 'New rack', needsName: true, name: 'Late night' })
  })

  it("One Touch: the style's four, the applied one, what each loads, Link and its timing", () => {
    const st = stateWithRacks()
    st.ots.applied = 3
    st.ots.racks[1] = { rack: st.racks[0].id, name: st.racks[0].name, missing: false }
    st.ots.racks[2] = { rack: 'gone', name: 'Old', missing: true }
    const ot = quickRacksView(st, null).oneTouch
    expect(ot.items).toHaveLength(Math.min(4, st.ots.settings.length))
    expect(ot.items[0]).toEqual({ name: st.ots.settings[0].name, rack: '', rackName: '', missing: false })
    expect(ot.items[1]).toMatchObject({ rack: st.racks[0].id, rackName: st.racks[0].name })
    expect(ot.items[2]).toMatchObject({ rack: 'gone', missing: true })
    expect(ot.racks.map((r) => r.name).sort()).toEqual(['Ballad', 'Strings'])
    expect(ot).toMatchObject({ applied: 3, link: st.ots.link, timing: st.ots.linkTiming, readOnly: false })
  })
})

describe('the commands', () => {
  it('a bank letter steps there one bank a command', () => {
    expect(bankCmds(0, 3)).toEqual(Array(3).fill({ type: 'stepQuickRackBank', delta: 1 }))
    expect(bankCmds(5, 3)).toEqual(Array(2).fill({ type: 'stepQuickRackBank', delta: -1 }))
    expect(bankCmds(2, 2)).toEqual([])
  })

  it('tap loads, long press stores over, ✕ clears in the bank on view', () => {
    const st = stateWithRacks()
    st.quickRacks.bank = 6
    expect(slotCmd(4)).toEqual({ type: 'pressQuickRack', slot: 4 })
    expect(storeCmd(4)).toEqual({ type: 'storeRack', slot: 4 })
    expect(clearCmd(st, 4)).toEqual({ type: 'clearQuickRack', bank: 6, slot: 4 })
  })

  it("an OTS's rack: one of yours, or '' for the style's own", () => {
    expect(otsRackCmd(1, 'r1')).toEqual({ type: 'setOtsRack', index: 1, id: 'r1' })
    expect(otsRackCmd(1, '')).toEqual({ type: 'clearOtsRack', index: 1 })
    expect(timingCmd('immediate')).toEqual({ type: 'setOtsLinkTiming', timing: 'immediate' })
  })

  it('Save rack: over the live rack, or as a new one under the name typed (blank keeps its name)', () => {
    const st = stateWithRacks()
    expect(saveCmd(st, 'ignored')).toEqual({ type: 'saveRack' })
    st.liveRack.id = null
    st.liveRack.name = 'New rack'
    expect(saveCmd(st, '  Late night ')).toEqual({ type: 'saveRackAs', name: 'Late night' })
    expect(saveCmd(st, null)).toEqual({ type: 'saveRackAs', name: 'New rack' })
    expect(saveCmd(st, '   ')).toEqual({ type: 'saveRackAs', name: 'New rack' })
  })
})
