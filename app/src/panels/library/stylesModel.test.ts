import { afterEach, describe, expect, it, vi } from 'vitest'
import { MockSession } from '../../lib/api/mock'
import type { AppCmd, AppState, LibraryEntry, LibraryList } from '../../lib/api/types'
import type { Category } from '../browser/model'
import type { FilePick } from '../../lib/files'
import { STYLE_FILE, stylesActions, stylesOrigin, stylesProps, type StylesCursor, type StylesPrefs } from './stylesModel'

function entry(id: number, name: string, folder: string, extra: Partial<LibraryEntry> = {}): LibraryEntry {
  return {
    id,
    name,
    folder,
    path: `/styles/${folder ? `${folder}/` : ''}${name.replace(/ /g, '')}.sty`,
    status: 'ok',
    error: null,
    tempo: 100 + id,
    timeSignature: [4, 4],
    sections: 'Main ABCD · Intro ABC · Ending ABC · Fill ABCD · Break',
    format: 'SFF2',
    ...extra,
  }
}

/** A small fake library in Track order (folder, then name). */
function library(): LibraryList {
  return {
    revision: 1,
    voices: [],
    harmonyTypes: [],
    arpPatterns: [],
    entries: [
      entry(0, 'Root Groove', ''),
      entry(1, 'Unplugged Ballad Pop', 'Pop & Rock/8Beat', { tempo: 76.4 }),
      entry(2, 'Coastal Highway', 'Pop & Rock/Pop'),
      entry(3, 'Sunday Drive Pop', 'Pop & Rock/Pop', { tempo: 104 }),
      entry(4, 'Waltz Pop', 'Pop & Rock/Pop', { timeSignature: [3, 4] }),
      entry(5, 'Broken Tape', 'Pop & Rock/Rock', { status: 'error', error: 'not a style file', tempo: null, format: null }),
      entry(6, 'Late Lounge', 'Swing', { status: 'pending', tempo: null, timeSignature: null, format: null }),
    ],
  }
}

class FakePrefs implements StylesPrefs {
  favourites: ReadonlySet<string> = new Set()
  recents: readonly string[] = []
  autoPreview = false
  category: Category = { kind: 'all' }
  toggleFavourite = vi.fn((path: string) => {
    const next = new Set(this.favourites)
    if (!next.delete(path)) next.add(path)
    this.favourites = next
  })
  setAutoPreview = vi.fn((on: boolean) => {
    this.autoPreview = on
  })
  setCategory = vi.fn((c: Category) => {
    this.category = c
  })
}

function setup(opts: { running?: boolean; loaded?: number; queued?: number | null; pick?: (p: FilePick) => Promise<string | null> } = {}) {
  const state: AppState = new MockSession({ demo: false, manual: true }).state
  const lib = library()
  state.style.id = opts.loaded ?? 3
  state.transport.running = opts.running ?? false
  state.preview = { audition: null, queued: opts.queued ?? null }
  state.library = { ...state.library, count: lib.entries.length, pending: 0, scanning: false }
  state.surface = { ...state.surface, trackPrev: { id: 2, name: 'Coastal Highway', path: '' }, trackNext: { id: 4, name: 'Waltz Pop', path: '' } }
  const prefs = new FakePrefs()
  const styles: StylesCursor = { cursor: state.style.id, query: '' }
  const sent: AppCmd[] = []
  const close = vi.fn()
  const actions = stylesActions({ state: () => state, library: () => lib, send: (c) => sent.push(c), prefs, styles, close, previewDelay: 600, pick: opts.pick })
  const props = () => stylesProps(state, lib, styles, prefs)
  return { state, lib, prefs, styles, sent, close, actions, props }
}

afterEach(() => {
  vi.useRealTimers()
})

describe('stylesProps', () => {
  it('lists every style in Track order with its cells, marks and folders', () => {
    const { props } = setup()
    const p = props()
    expect(p.viewName).toBe('All styles')
    expect(p.view).toBe('all')
    expect(p.folder).toBeNull()
    expect(p.count).toBe('7')
    expect(p.views.map((v) => `${v.label} ${v.count}`)).toEqual(['All 7', 'Favourites 0', 'Recent 0'])
    expect(p.folders.map((f) => [f.id, f.label, f.count])).toEqual([
      ['', 'Library root', '1'],
      ['Pop & Rock', 'Pop & Rock', '5'],
      ['Swing', 'Swing', '1'],
    ])
    expect(p.rows.map((r) => r.id)).toEqual(['0', '1', '2', '3', '4', '5', '6'])
    expect(p.rows[1].cells).toEqual(['2', 'Unplugged Ballad Pop', 'Pop & Rock/8Beat', '76', '4/4', 'SFF2'])
    expect(p.rows.map((r) => r.mark ?? '')).toEqual(['', '', '◀', '●', '▶', '', ''])
    expect(p.rows[3].name).toBe('Sunday Drive Pop, Pop & Rock/Pop, 104 BPM, 4/4, loaded')
    // Unreadable: the error in the folder cell, ⚠, dim. Pending: "…", dim.
    expect(p.rows[5]).toMatchObject({ cells: ['6', 'Broken Tape', 'not a style file', '', '', ''], warn: true, dim: true })
    expect(p.rows[6]).toMatchObject({ cells: ['7', 'Late Lounge', 'Swing', '…', '', '…'], dim: true })
    expect(p.cursor).toBe('3')
    expect(p.load).toEqual({ label: 'Load Sunday Drive Pop', name: 'Sunday Drive Pop is loaded', face: 'rest', disabled: true, queues: false })
    expect(p.canOpenFile).toBe(true)
  })

  it('a folder shows its styles with the subfolder, and a remembered subfolder reads as its top folder', () => {
    const { props, prefs } = setup()
    prefs.category = { kind: 'folder', path: 'Pop & Rock/Pop' }
    const p = props()
    expect(p.folder).toBe('Pop & Rock')
    expect(p.view).toBeNull()
    expect(p.viewName).toBe('Pop & Rock')
    expect(p.count).toBe('5')
    expect(p.rows.map((r) => r.cells[2])).toEqual(['8Beat', 'Pop', 'Pop', 'Pop', 'not a style file'])
    prefs.category = { kind: 'folder', path: 'Gone' }
    expect(props().viewName).toBe('All styles')
  })

  it('filters by name, tempo or time, keeps the order, and keeps the cursor or takes the first row', () => {
    const { props, styles, state } = setup()
    state.library.pending = 1200
    // "pop" matches names and the folder "Pop & Rock".
    styles.query = ' POP '
    let p = props()
    expect(p.rows.map((r) => r.id)).toEqual(['1', '2', '3', '4', '5'])
    expect(p.count).toBe('5 of 7 · 1,200 indexing')
    styles.query = 'unplugged'
    expect(props().cursor).toBe('1')
    styles.query = 'pop'
    expect(p.cursor).toBe('3')
    styles.query = '3/4'
    expect(props().rows.map((r) => r.id)).toEqual(['4'])
    expect(props().cursor).toBe('4')
    styles.query = '76'
    expect(props().rows.map((r) => r.id)).toEqual(['1'])
    styles.query = 'zydeco'
    p = props()
    expect(p.rows).toEqual([])
    expect(p.cursor).toBeNull()
    expect(p.emptyText).toBe('No style matches “zydeco”')
    expect(p.load).toMatchObject({ label: 'Load', disabled: true })
  })

  it('favourites and recents', () => {
    const { props, prefs, lib } = setup()
    prefs.favourites = new Set([lib.entries[4].path])
    prefs.recents = [lib.entries[2].path, '/gone.sty', lib.entries[0].path]
    expect(props().views.map((v) => v.count)).toEqual(['7', '1', '2'])
    prefs.category = { kind: 'recents' }
    expect(props().rows.map((r) => r.id)).toEqual(['2', '0'])
    expect(props().viewName).toBe('Recent')
    prefs.category = { kind: 'favourites' }
    expect(props().rows.map((r) => ({ id: r.id, star: r.star }))).toEqual([{ id: '4', star: true }])
    prefs.favourites = new Set()
    expect(props().emptyText).toBe('No favourites yet: star a style with ☆ (or Ctrl+D).')
  })

  it('running with a style queued: its badge, the waiting Load, Cancel shown, Preview on select absent', () => {
    const { props, styles } = setup({ running: true, queued: 2 })
    styles.cursor = 2
    const p = props()
    expect(p.running).toBe(true)
    expect(p.queued).toBe(true)
    expect(p.canCancel).toBe(false)
    expect(p.rows[2].badge).toBe('next bar')
    expect(p.rows[3].name).toContain('loaded and playing')
    expect(p.load).toEqual({
      label: 'Load Coastal Highway · next bar',
      name: 'Coastal Highway loads at the next bar (queued)',
      face: 'waiting',
      disabled: false,
      queues: true,
    })
    styles.cursor = 4
    expect(props().load).toMatchObject({ label: 'Load Waltz Pop · next bar', name: 'Load Waltz Pop at the next bar', face: 'rest' })
  })

  it('the preview note while stopped', () => {
    const { props, state } = setup()
    state.preview.audition = { id: 4, bar: 2, bars: 4, chord: 'Am' }
    expect(props().note).toBe('Previewing Waltz Pop · bar 2/4 · Am')
  })

  it('reuses the rows while only the cursor or the clock changes', () => {
    const { props, styles } = setup()
    const a = props().rows
    styles.cursor = 4
    expect(props().rows).toBe(a)
  })

  it('the library still loading', () => {
    const { state, prefs, styles } = setup()
    const empty: LibraryList = { ...library(), entries: [] }
    state.library.count = 900
    const p = stylesProps(state, empty, styles, prefs)
    expect(p.count).toBe('—')
    expect(p.emptyText).toBe('Reading the library…')
  })

  it('stylesOrigin is the queued style, else the loaded one', () => {
    const { state } = setup({ queued: 4 })
    expect(stylesOrigin(state)).toBe(4)
    state.preview.queued = null
    expect(stylesOrigin(state)).toBe(3)
  })
})

describe('stylesActions', () => {
  it('views, folders and the filter change the page state', () => {
    const { actions, prefs, styles, sent } = setup()
    actions.onview('favourites')
    expect(prefs.setCategory).toHaveBeenLastCalledWith({ kind: 'favourites' })
    actions.onfolder('Pop & Rock')
    expect(prefs.setCategory).toHaveBeenLastCalledWith({ kind: 'folder', path: 'Pop & Rock' })
    actions.onquery('waltz')
    expect(styles.query).toBe('waltz')
    actions.onselect('4')
    expect(styles.cursor).toBe(4)
    expect(sent).toEqual([])
  })

  it('load while stopped sends loadStyle and goes back to the Stage; the loaded or unreadable style sends nothing', () => {
    const { actions, sent, close } = setup()
    actions.onload('3')
    actions.onload('5')
    expect(sent).toEqual([])
    actions.onload('4')
    expect(sent).toEqual([{ type: 'loadStyle', id: 4 }])
    expect(close).toHaveBeenCalledOnce()
  })

  it('load while running queues for the next bar, once', () => {
    const { actions, sent, close, state } = setup({ running: true })
    actions.onload('4')
    expect(sent).toEqual([{ type: 'queueStyle', id: 4 }])
    state.preview.queued = 4
    actions.onload('4')
    actions.onpreview('3')
    expect(sent).toHaveLength(1)
    actions.onpreview('2')
    expect(sent[1]).toEqual({ type: 'queueStyle', id: 2 })
    expect(close).not.toHaveBeenCalled()
  })

  it('Open file… picks a style file, sends loadStylePath with its path and, stopped, goes back to the Stage', async () => {
    const pick = vi.fn(async () => '/Users/me/Styles/Funk Pop.sty')
    const { actions, sent, close } = setup({ pick })
    await actions.onopenfile()
    expect(pick).toHaveBeenCalledExactlyOnceWith(STYLE_FILE)
    expect(STYLE_FILE.filter.extensions).toEqual(['sty', 'prs', 'sst', 'bcs', 'pcs', 'pst', 'fps'])
    expect(sent).toEqual([{ type: 'loadStylePath', path: '/Users/me/Styles/Funk Pop.sty' }])
    expect(close).toHaveBeenCalledOnce()
  })

  it('Open file… while running loads and stays on the page; a cancel or a failure sends nothing', async () => {
    const running = setup({ running: true, pick: async () => '/x/Waltz.prs' })
    await running.actions.onopenfile()
    expect(running.sent).toEqual([{ type: 'loadStylePath', path: '/x/Waltz.prs' }])
    expect(running.close).not.toHaveBeenCalled()

    const cancelled = setup({ pick: async () => null })
    await cancelled.actions.onopenfile()
    expect(cancelled.sent).toEqual([])
    expect(cancelled.close).not.toHaveBeenCalled()

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const failed = setup({
      pick: async () => {
        throw new Error('dialog.open not allowed')
      },
    })
    await expect(failed.actions.onopenfile()).resolves.toBeUndefined()
    expect(failed.sent).toEqual([])
    expect(warn).toHaveBeenCalledWith("The file picker didn't open: dialog.open not allowed")
    warn.mockRestore()
  })

  it('Shift+Enter while stopped previews, or stops the preview of, an ok style', () => {
    const { actions, sent, state } = setup()
    actions.onpreview('4')
    expect(sent).toEqual([{ type: 'auditionStyle', id: 4 }])
    state.preview.audition = { id: 4, bar: 1, bars: 4, chord: null }
    actions.onpreview('4')
    expect(sent[1]).toEqual({ type: 'stopAudition' })
    actions.onpreview('6')
    actions.onpreview('5')
    expect(sent).toHaveLength(2)
  })

  it('stars by path', () => {
    const { actions, prefs, lib } = setup()
    actions.onstar('4', true)
    expect(prefs.toggleFavourite).toHaveBeenCalledWith(lib.entries[4].path)
    actions.onstar('4', true)
    expect(prefs.toggleFavourite).toHaveBeenCalledOnce()
    actions.onautopreview(true)
    expect(prefs.setAutoPreview).toHaveBeenCalledWith(true)
  })

  it('Preview on select auditions after the dwell, stopped and on ok rows only', () => {
    vi.useFakeTimers()
    const { actions, sent, prefs, state } = setup()
    actions.onselect('4')
    vi.advanceTimersByTime(1000)
    expect(sent).toEqual([])
    prefs.autoPreview = true
    actions.onselect('2')
    vi.advanceTimersByTime(300)
    actions.onselect('4')
    vi.advanceTimersByTime(599)
    expect(sent).toEqual([])
    vi.advanceTimersByTime(1)
    expect(sent).toEqual([{ type: 'auditionStyle', id: 4 }])
    actions.onselect('6')
    vi.advanceTimersByTime(1000)
    state.transport.running = true
    actions.onselect('2')
    vi.advanceTimersByTime(1000)
    expect(sent).toHaveLength(1)
  })
})
