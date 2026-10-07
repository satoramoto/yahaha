import { describe, expect, it } from 'vitest'
import { MockSession } from '../../lib/api/mock'
import type { AppCmd, AppState, PartPlugin } from '../../lib/api/types'
import { racksActions, racksProps, type RacksNav, type RacksUi } from './racksModel'

/** The demo mock's state with three racks: Sunday drive (loaded, on A1, modified, Right 3's
 * plugin missing), Organ (on A4, One Touch 2 of the style) and Film score (needs attention). */
function fixture(): AppState {
  const s = structuredClone(new MockSession({ demo: true, manual: true }).state)
  s.racks = [
    { id: 'sunday', name: 'Sunday drive', parts: ['Stage Grand', 'Silk Strings', 'Orchestra Deluxe', 'Fingered Bass'], on: [true, true, true, true], needsAttention: true },
    { id: 'organ', name: 'Organ', parts: ['Drawbar Jazz', 'Rotary Full', 'Silk Strings', 'Upright'], on: [true, true, false, true], needsAttention: false },
    { id: 'film', name: 'Film score', parts: ['Wide Strings', 'Horns', 'Choir', 'Cello'], on: [true, true, true, false], needsAttention: true },
  ]
  s.liveRack = { ...s.liveRack, name: 'Sunday drive', id: 'sunday', modified: true }
  s.quickRacks.bank = 0
  s.quickRacks.buttons = s.quickRacks.buttons.map((b, i) =>
    i === 0 ? { rack: 'sunday', name: 'Sunday drive', missing: false, loaded: true } : i === 3 ? { rack: 'organ', name: 'Organ', missing: false, loaded: false } : { rack: null, name: '', missing: false, loaded: false },
  )
  s.plugins.needsAttention = [
    { id: 'sunday', name: 'Sunday drive', parts: [2] },
    { id: 'film', name: 'Film score', parts: [0] },
  ]
  s.keyboardParts[2].plugin = { name: 'Orchestra Deluxe', missing: true } as PartPlugin
  s.ots.racks = s.ots.settings.slice(0, 4).map((_, i) => (i === 1 ? { rack: 'organ', name: 'Organ', missing: false } : { rack: null, name: '', missing: false }))
  s.ots.applied = 2
  return s
}

const nav = (over: Partial<RacksNav> = {}): RacksNav => ({ attention: false, rackQuery: '', rack: null, ...over })
const ui = (over: Partial<RacksUi> = {}): RacksUi => ({ confirming: null, saveAsName: null, dupBefore: null, ...over })

function setup(n = nav(), u = ui()) {
  const state = fixture()
  const sent: AppCmd[] = []
  const actions = racksActions({ state: () => state, send: (c) => sent.push(c), nav: n, ui: u })
  return { state, sent, actions, n, u }
}

describe('racksProps', () => {
  it('fills the loaded line, the missing plugin, the list and the loaded rack as chosen', () => {
    const p = racksProps(fixture(), nav(), ui())
    expect(p.count).toBe(3)
    expect(p.attentionCount).toBe(2)
    expect(p.loaded).toEqual({ name: 'Sunday drive', modified: true, missing: true, slot: 'A1', canSave: true })
    expect(p.missing).toEqual([{ part: 'Right 3', plugin: 'Orchestra Deluxe' }])
    expect(p.rows.map((r) => r.cells)).toEqual([
      ['Sunday drive', 'Stage Grand · Silk Strings · Orchestra Deluxe · Fingered Bass', 'A1'],
      ['Organ', 'Drawbar Jazz · Rotary Full · Upright', 'A4'],
      ['Film score', 'Wide Strings · Horns · Choir', ''],
    ])
    expect(p.rows.map((r) => r.warn)).toEqual([true, false, true])
    expect(p.selected).toBe('sunday')
    expect(p.chosen?.loaded).toBe(true)
    expect(p.confirming).toBe(false)
  })

  it('the chosen rack: parts, Quick Rack and the delete note with its One Touch', () => {
    const p = racksProps(fixture(), nav({ rack: 'organ' }), ui({ confirming: 'organ' }))
    expect(p.selected).toBe('organ')
    expect(p.chosen).toEqual({
      id: 'organ',
      name: 'Organ',
      loaded: false,
      subtitle: 'Quick Rack A4',
      parts: [
        { tag: 'R1', name: 'Drawbar Jazz', on: true },
        { tag: 'R2', name: 'Rotary Full', on: true },
        { tag: 'R3', name: 'Silk Strings', on: false },
        { tag: 'L', name: 'Upright', on: true },
      ],
      deleteNote: "Quick Rack A4 will be empty. One Touch 2 goes back to the style's own.",
    })
    expect(p.confirming).toBe(true)
  })

  it('a rack on no Quick Rack, a gone rack falls back to the loaded one, and the loaded one never confirms', () => {
    expect(racksProps(fixture(), nav({ rack: 'film' }), ui()).chosen?.subtitle).toBe('Not on a Quick Rack in bank A')
    expect(racksProps(fixture(), nav({ rack: 'gone' }), ui()).selected).toBe('sunday')
    expect(racksProps(fixture(), nav(), ui({ confirming: 'sunday' })).confirming).toBe(false)
  })

  it('filters by Needs attention and the search', () => {
    expect(racksProps(fixture(), nav({ attention: true }), ui()).rows.map((r) => r.id)).toEqual(['sunday', 'film'])
    const q = racksProps(fixture(), nav({ rackQuery: 'drawbar' }), ui())
    expect(q.rows.map((r) => r.id)).toEqual(['organ'])
    expect(racksProps(fixture(), nav({ rackQuery: 'zzz' }), ui()).emptyText).toBe('No racks match “zzz”.')
  })

  it('a duplicate waiting for its copy chooses the new rack', () => {
    const s = fixture()
    s.racks.push({ ...s.racks[1], id: 'organ2', name: 'Organ copy' })
    expect(racksProps(s, nav({ rack: 'organ' }), ui({ dupBefore: ['sunday', 'organ', 'film'] })).selected).toBe('organ2')
  })

  it('style racks: the style, the slots, the applied one, link and timing', () => {
    const s = fixture()
    const p = racksProps(s, nav(), ui())
    expect(p.styleRacks.style).toBe(s.style.name)
    expect(p.styleRacks.slots[1]).toEqual({ rack: 'organ', missing: false })
    expect(p.styleRacks.applied).toBe(2)
    expect(p.styleRacks.racks.map((r) => r.id)).toEqual(['sunday', 'organ', 'film'])
    expect(p.styleRacks.timing).toBe(s.ots.linkTiming)
  })
})

describe('racksActions', () => {
  it('sends the rack commands', () => {
    const { sent, actions } = setup(nav({ rack: 'organ' }))
    actions.onnew()
    actions.onsave()
    actions.onsaveas('  Late show ')
    actions.onload('film')
    actions.onrename('Jazz organ')
    actions.onrename('Organ')
    actions.onotsrack(0, 'film')
    actions.onotsrack(1, null)
    actions.onotslink(true)
    actions.onotstiming('immediate')
    expect(sent).toEqual([
      { type: 'newRack' },
      { type: 'saveRack' },
      { type: 'saveRackAs', name: 'Late show' },
      { type: 'loadRack', id: 'film' },
      { type: 'renameRack', id: 'organ', name: 'Jazz organ' },
      { type: 'setOtsRack', index: 0, id: 'film' },
      { type: 'clearOtsRack', index: 1 },
      { type: 'setOtsLink', on: true },
      { type: 'setOtsLinkTiming', timing: 'immediate' },
    ])
  })

  it('Save does nothing when the saved rack is unchanged', () => {
    const { state, sent, actions } = setup()
    state.liveRack.modified = false
    actions.onsave()
    expect(sent).toEqual([])
  })

  it('Save as… opens with a copy name, takes edits and closes', () => {
    const { actions, u } = setup()
    actions.onsaveasopen()
    expect(u.saveAsName).toBe('Sunday drive copy')
    actions.onsaveasname('Late show')
    expect(u.saveAsName).toBe('Late show')
    actions.onsaveascancel()
    expect(u.saveAsName).toBeNull()
  })

  it('Delete asks first, is refused for the loaded rack and lets the selection go', () => {
    const { sent, actions, n, u } = setup(nav({ rack: 'organ' }))
    actions.onaskdelete()
    expect(u.confirming).toBe('organ')
    actions.oncanceldelete()
    expect(u.confirming).toBeNull()
    actions.onaskdelete()
    actions.ondelete()
    expect(sent).toEqual([{ type: 'deleteRack', id: 'organ' }])
    expect(n.rack).toBeNull()
    expect(u.confirming).toBeNull()

    actions.onaskdelete() // now the loaded rack is chosen
    expect(u.confirming).toBeNull()
    actions.ondelete()
    expect(sent).toHaveLength(1)
  })

  it('select, search, filter and duplicate change the page state', () => {
    const { sent, actions, n, u } = setup(nav(), ui({ confirming: 'organ' }))
    actions.onselect('film')
    expect(n.rack).toBe('film')
    expect(u.confirming).toBeNull()
    actions.onquery('organ')
    expect(n.rackQuery).toBe('organ')
    actions.onattention(true)
    expect(n.attention).toBe(true)
    actions.onduplicate()
    expect(sent).toEqual([{ type: 'duplicateRack', id: 'film' }])
    expect(u.dupBefore).toEqual(['sunday', 'organ', 'film'])
  })
})
