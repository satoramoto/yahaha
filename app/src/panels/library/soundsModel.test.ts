import { describe, expect, it, vi } from 'vitest'
import { MockSession } from '../../lib/api/mock'
import type { AppCmd, AppState, SoundCatalog } from '../../lib/api/types'
import { NO_FILTER, type SoundFilter } from './model'
import { soundsActions, soundsProps, presetsToList, type SoundsPageLike } from './soundsModel'

async function mock() {
  const s = new MockSession({ demo: true, manual: true })
  const catalog = await s.sounds()
  return { state: s.state, catalog }
}

const page = (): SoundsPageLike => ({ selected: null, saveAs: null, confirmDelete: false })

function setup(state: AppState, catalog: SoundCatalog, part = 1) {
  const sent: AppCmd[] = []
  const nav: SoundFilter = { ...NO_FILTER }
  const pg = page()
  const setPart = vi.fn()
  const a = soundsActions({ state: () => state, catalog: () => catalog, part: () => part, send: (c) => sent.push(c), setPart, nav, page: pg })
  return { a, sent, nav, pg, setPart }
}

describe('soundsProps', () => {
  it('fills the page from the demo state: parts, categories, rows and the target part playing', async () => {
    const { state, catalog } = await mock()
    const p = soundsProps(state, catalog, 0, { ...NO_FILTER }, page())
    expect(p.partNames).toEqual(state.keyboardParts.map((k) => k.name))
    expect(p.categories).toHaveLength(13)
    expect(p.rows.length).toBeGreaterThan(0)
    expect(p.rows.every((r) => r.cells.length === 4)).toBe(true)
    expect(p.source).toBe('all')
    expect(p.running).toBe(state.transport.running)
    expect(p.nowPlaying.name).toBe(state.keyboardParts[0].sound?.name ?? state.keyboardParts[0].voiceName)
    // The selected row is what the target part plays, and the details show it.
    if (p.selected) {
      expect(p.detail?.id).toBe(p.selected)
      expect(p.detail?.playingOn).toContain(0)
    }
  })

  it('the same inputs give the same rows array (memoised)', async () => {
    const { state, catalog } = await mock()
    const a = soundsProps(state, catalog, 0, { ...NO_FILTER }, page())
    const b = soundsProps(state, catalog, 0, { ...NO_FILTER }, page())
    expect(b.rows).toBe(a.rows)
  })

  it('★ shows as the Starred tab; a moved-to row is selected; a My Sounds sound is editable and can move', async () => {
    const { state, catalog } = await mock()
    const patches = state.soundLibrary.patches
    expect(patches.length).toBeGreaterThan(1)
    const id = `saved:${patches[1].id}`
    const pg = { ...page(), selected: id }
    const p = soundsProps(state, catalog, 0, { ...NO_FILTER, favourites: true }, pg)
    expect(p.source).toBe('starred')
    expect(p.selected).toBe(id)
    expect(p.detail).toMatchObject({ id, badge: 'mine', number: String(patches[1].number), categoryEditable: true, inMySounds: true, canAudition: true, canMoveUp: true })
  })

  it('a SoundFont preset auditions but has no number and no category control', async () => {
    const { state, catalog } = await mock()
    const sf = catalog.entries.find((e) => e.source === 'soundFont')!
    const p = soundsProps(state, catalog, 0, { ...NO_FILTER }, { ...page(), selected: sf.id })
    expect(p.detail).toMatchObject({ badge: 'soundFont', categoryEditable: false, canAudition: true, canMoveUp: false, canMoveDown: false })
    expect(p.detail?.number).toBeUndefined()
  })

  it('an empty catalog says so', async () => {
    const { state } = await mock()
    const p = soundsProps(state, { revision: 0, entries: [], recents: [] }, 0, { ...NO_FILTER }, page())
    expect(p.rows).toEqual([])
    expect(p.detail).toBeNull()
    expect(p.emptyText).toMatch(/No sounds yet/)
  })
})

describe('soundsActions', () => {
  it('a row click plays the sound on the target part and selects it; star, save and copy send theirs', async () => {
    const { state, catalog } = await mock()
    const { a, sent, pg } = setup(state, catalog, 2)
    a.onselect('sf:X.sf2:0:5')
    a.onstar('sf:X.sf2:0:5', true)
    a.onsave()
    a.oncopy('sf:X.sf2:0:5')
    a.onuse('au:sampler')
    a.onsetcategory('au:sampler', 'pad')
    expect(pg.selected).toBe('au:sampler')
    expect(sent).toEqual([
      { type: 'assignSound', part: 2, id: 'sf:X.sf2:0:5' },
      { type: 'setSoundFavourite', id: 'sf:X.sf2:0:5', on: true },
      { type: 'saveSound', part: 2 },
      { type: 'addToMySounds', id: 'sf:X.sf2:0:5' },
      { type: 'assignSound', part: 2, id: 'au:sampler' },
      { type: 'setSoundCategory', id: 'au:sampler', category: 'pad' },
    ])
  })

  it('filters write libraryNav; Starred is the ★ switch; a new part clears the page state', async () => {
    const { state, catalog } = await mock()
    const { a, nav, pg, setPart } = setup(state, catalog)
    a.onquery('silk')
    a.onsource('starred')
    expect(nav).toMatchObject({ query: 'silk', favourites: true, source: 'all' })
    a.onsource('mine')
    expect(nav).toMatchObject({ favourites: false, source: 'mine' })
    a.oncategory('strings')
    expect(nav.category).toBe('strings')
    nav.instrument = 'au:sampler'
    a.onclearinstrument()
    expect(nav.instrument).toBeNull()
    pg.selected = 'x'
    pg.confirmDelete = true
    a.onpart(3)
    expect(setPart).toHaveBeenCalledWith(3)
    expect(pg).toEqual(page())
  })

  it('My Sounds actions send the patch id: audition, duplicate, move, delete after the confirm', async () => {
    const { state, catalog } = await mock()
    state.transport.running = false
    const patches = state.soundLibrary.patches
    const p1 = patches[1]
    const id = `saved:${p1.id}`
    const { a, sent, pg } = setup(state, catalog)
    a.onaudition(id)
    a.onduplicate(id)
    a.onmove(id, -1)
    a.onmove(id, 1)
    a.onaskdelete()
    expect(pg.confirmDelete).toBe(true)
    a.ondelete(id)
    expect(pg.confirmDelete).toBe(false)
    expect(sent).toEqual([
      { type: 'auditionPatch', id: p1.id },
      { type: 'duplicatePatch', id: p1.id },
      { type: 'movePatch', id: p1.id, to: 0 },
      ...(patches.length > 2 ? [{ type: 'movePatch', id: p1.id, to: 2 }] : []),
      { type: 'deletePatch', id: p1.id },
    ])
    // The first can't move up.
    sent.length = 0
    a.onmove(`saved:${patches[0].id}`, -1)
    expect(sent).toEqual([])
  })

  it('a SoundFont preset auditions as a preset; nothing auditions while the band runs', async () => {
    const { state, catalog } = await mock()
    const { a, sent } = setup(state, catalog)
    state.transport.running = false
    a.onaudition('sf:Demo.sf2:0:48')
    state.transport.running = true
    a.onaudition('sf:Demo.sf2:0:49')
    expect(sent).toEqual([{ type: 'auditionPreset', file: 'Demo.sf2', bank: 0, program: 48 }])
  })

  it('Save as… opens with the part\'s sound name, saves under the edited name and closes', async () => {
    const { state, catalog } = await mock()
    const { a, sent, pg } = setup(state, catalog, 0)
    a.onsaveasopen()
    const kp = state.keyboardParts[0]
    expect(pg.saveAs).toMatchObject({ name: kp.sound?.name ?? kp.voiceName, aupreset: false, replace: false })
    a.onsaveasedit({ name: '  Evening Pad ' })
    a.onsaveas(false)
    expect(sent).toEqual([{ type: 'saveSoundAs', part: 0, name: 'Evening Pad' }])
    expect(pg.saveAs).toBeNull()
    a.onsaveasopen()
    a.onsaveascancel()
    expect(pg.saveAs).toBeNull()
  })

  it('Save as… with .aupreset asks before replacing a user preset of that name, then saves both', async () => {
    const { state, catalog: base } = await mock()
    const kp = state.keyboardParts[0]
    kp.plugin = { ...(kp.plugin ?? {}), id: 'sampler', status: 'playing', missing: false } as NonNullable<typeof kp.plugin>
    const catalog: SoundCatalog = {
      ...base,
      entries: [...base.entries, { id: 'au:sampler#u:/p/Evening.aupreset', name: 'Evening', category: 'pad', source: 'plugin', detail: '', favourite: false, recent: false, plugin: { format: 'AUv2', lastError: null }, parent: 'au:sampler' }],
    }
    const { a, sent, pg } = setup(state, catalog, 0)
    pg.saveAs = { name: 'Evening', aupreset: true, category: 'pad', replace: false }
    a.onsaveas(false)
    expect(sent).toEqual([])
    expect(pg.saveAs?.replace).toBe(true)
    a.onsaveascancel()
    expect(pg.saveAs).toMatchObject({ name: 'Evening', replace: false })
    a.onsaveas(true)
    expect(sent).toEqual([
      { type: 'savePartAsPluginPreset', part: 0, name: 'Evening', category: 'pad', overwrite: true },
      { type: 'saveSoundAs', part: 0, name: 'Evening' },
    ])
  })
})

describe('presetsToList', () => {
  it('names a plugin instrument whose presets are not listed yet, else null', async () => {
    const { state, catalog: base } = await mock()
    const catalog: SoundCatalog = {
      ...base,
      entries: [...base.entries, { id: 'au:sampler', name: 'Sampler Deluxe', category: 'synthLead', source: 'plugin', detail: 'Maker', favourite: false, recent: false, plugin: { format: 'AUv2', lastError: null } }],
    }
    expect(presetsToList(state, catalog, { instrument: 'au:sampler' })).toBe('au:sampler')
    expect(presetsToList(state, catalog, { instrument: null })).toBeNull()
    expect(presetsToList(state, catalog, { instrument: 'sf:Demo.sf2' })).toBeNull()
  })
})
