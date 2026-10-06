// Library › Styles: the style browser's page model. Turns the app state, the style library and
// the page's app-only state into LibraryStyles' data props, and its callbacks into commands.
//
// The wiring (LibraryScreen.svelte) does:
//
//   <LibraryStyles {...stylesProps(app.state, app.library, stylesState, prefs)}
//                  {...stylesActions({ state: () => app.state, library: () => app.library,
//                                      send: (c) => app.send(c), prefs, styles: stylesState,
//                                      close: () => (ui.view = 'stage'), isOpen: () => … })}
//                  {tipAction} />
//
//   stylesProps(state: AppState, library: LibraryList, styles: StylesCursor, prefs: StylesPrefsView): StylesData
//   stylesActions(deps: StylesDeps): StylesActions
//   stylesOrigin(state: AppState): number   (the style the cursor opens on: queued, else loaded)
//
// and, when the page opens, `stylesState.reset(stylesOrigin(app.state))`, and in an effect while
// it is open, `stylesState.follow(stylesOrigin(app.state))`.
//
// Rules (docs/specs/push/Browser.md, "Styles page"): the order is the library's own (folder, then
// name), the order Track ◀ ▶ step through; Recent is newest first. The folders are the top-level
// ones; a remembered subfolder reads as its top-level folder, a vanished one as All (never
// rewritten). The filter matches the name, the file name or the folder (substring, any case), a
// whole number equal to the rounded tempo ("104"), or a time signature ("3/4").
//
// A library can hold 60,000 styles and the state changes many times a second, so everything
// built from the library is memoised on the identity of its inputs (the entries array, the
// favourites set and the recents list are replaced whole when they change).

import type { AppCmd, AppState, LibraryEntry, LibraryList } from '../../lib/api/types'
import type { FolderItem } from '../../ui/FolderList/types'
import type { StyleLoad, StyleView, StyleViewTab } from '../../ui/LibraryStyles/types'
import type { ListRow } from '../../ui/ListTable/types'
import { folderTree, indexLibrary, type Category, type Indexed } from '../browser/model'

/** The prefs the page reads (panels/browser/prefs.svelte.ts `prefs`). */
export interface StylesPrefsView {
  readonly favourites: ReadonlySet<string>
  readonly recents: readonly string[]
  readonly autoPreview: boolean
  readonly category: Category
}

/** The prefs the page reads and changes. */
export interface StylesPrefs extends StylesPrefsView {
  toggleFavourite(path: string): void
  setAutoPreview(on: boolean): void
  setCategory(c: Category): void
}

/** The page's app-only state (stylesState.svelte.ts). */
export interface StylesCursor {
  cursor: number | null
  query: string
}

/** LibraryStyles' data props. */
export interface StylesData {
  viewName: string
  count: string
  views: StyleViewTab[]
  view: StyleView | null
  folders: FolderItem[]
  folder: string | null
  rows: ListRow[]
  cursor: string | null
  query: string
  emptyText: string
  autoPreview: boolean
  running: boolean
  note: string
  queued: boolean
  canCancel: boolean
  load: StyleLoad
  canOpenFile: boolean
}

/** LibraryStyles' callbacks the model provides (Cancel and Open file… are drawn absent: no command yet). */
export interface StylesActions {
  onview: (view: StyleView) => void
  onfolder: (id: string) => void
  onquery: (query: string) => void
  onselect: (id: string) => void
  onload: (id: string) => void
  onpreview: (id: string) => void
  onstar: (id: string, on: boolean) => void
  onautopreview: (on: boolean) => void
}

export interface StylesDeps {
  state: () => AppState
  library: () => LibraryList
  send: (cmd: AppCmd) => void
  prefs: StylesPrefs
  styles: StylesCursor
  /** Back to the Stage: called after a load while stopped. */
  close?: () => void
  /** Whether the page is still showing: a Preview on select dwell that ends after it closed sends nothing. */
  isOpen?: () => boolean
  /** Preview on select's dwell in ms (default 600). */
  previewDelay?: number
}

/** How long the cursor must rest on a row before Preview on select plays it. */
export const PREVIEW_DELAY_MS = 600

const fmt = (n: number) => n.toLocaleString('en-US')

/** The style the cursor opens on and follows: the queued one, else the loaded one. */
export function stylesOrigin(state: AppState): number {
  return state.preview?.queued ?? state.style.id
}

// ── Memoised per library ───────────────────────────────────────────────────

interface LibIndex {
  ix: Indexed
  /** Rounded tempo ("104") and time ("4/4") per entry, '' when unknown. */
  tempo: string[]
  time: string[]
  /** Library id → entry index. */
  byId: Map<number, number>
  /** Top-level folders in library order, with their counts. */
  tops: { path: string; name: string; count: number }[]
  topSet: Set<string>
}

const libMemo = new WeakMap<LibraryEntry[], LibIndex>()

function libIndex(entries: LibraryEntry[]): LibIndex {
  let li = libMemo.get(entries)
  if (li) return li
  const n = entries.length
  const tempo: string[] = new Array(n)
  const time: string[] = new Array(n)
  const byId = new Map<number, number>()
  for (let i = 0; i < n; i++) {
    const e = entries[i]
    tempo[i] = e.tempo === null ? '' : String(Math.round(e.tempo))
    time[i] = e.timeSignature === null ? '' : `${e.timeSignature[0]}/${e.timeSignature[1]}`
    byId.set(e.id, i)
  }
  const tops = folderTree(entries)
    .filter((f) => f.depth === 0)
    .map((f) => ({ path: f.path, name: f.path === '' ? 'Library root' : f.name, count: f.count }))
  li = { ix: indexLibrary(entries), tempo, time, byId, tops, topSet: new Set(tops.map((t) => t.path)) }
  libMemo.set(entries, li)
  return li
}

/** The category as shown: a subfolder reads as its top-level folder, a vanished folder as All. */
function shownCategory(c: Category, li: LibIndex): Category {
  if (c.kind !== 'folder') return c
  const top = c.path === '' ? '' : c.path.split('/')[0]
  return li.topSet.has(top) ? { kind: 'folder', path: top } : { kind: 'all' }
}

function inFolder(folder: string, top: string): boolean {
  if (top === '') return folder === ''
  return folder === top || (folder.length > top.length && folder.startsWith(top) && folder[top.length] === '/')
}

/** The entry indices a category shows, before the filter. */
function categoryRows(li: LibIndex, c: Category, favourites: ReadonlySet<string>, recents: readonly string[]): number[] {
  const { entries, byPath } = li.ix
  const out: number[] = []
  if (c.kind === 'recents') {
    for (const p of recents) {
      const i = byPath.get(p)
      if (i !== undefined) out.push(i)
    }
    return out
  }
  if (c.kind === 'favourites') {
    for (let i = 0; i < entries.length; i++) if (favourites.has(entries[i].path)) out.push(i)
    return out
  }
  if (c.kind === 'all') {
    for (let i = 0; i < entries.length; i++) out.push(i)
    return out
  }
  for (let i = 0; i < entries.length; i++) if (inFolder(entries[i].folder, c.path)) out.push(i)
  return out
}

/** Filters `rows` by the query (see the header). */
function filterRows(li: LibIndex, rows: number[], query: string): number[] {
  const q = query.trim().toLowerCase()
  if (q === '') return rows
  const { name, stem, folder } = li.ix
  const whole = /^\d+$/.test(q)
  const sig = /^\d+\/\d+$/.test(q)
  return rows.filter(
    (i) => name[i].includes(q) || stem[i].includes(q) || folder[i].includes(q) || (whole && li.tempo[i] === q) || (sig && li.time[i] === q),
  )
}

/** A one-slot cache: recomputes when any key differs (by identity) from the last call's. */
function memo<K extends unknown[], V>(compute: (...keys: K) => V): (...keys: K) => V {
  let last: K | null = null
  let value: V
  return (...keys: K) => {
    if (last === null || last.length !== keys.length || keys.some((k, i) => k !== last![i])) {
      value = compute(...keys)
      last = keys
    }
    return value
  }
}

const categoryMemo = memo(
  (li: LibIndex, kind: Category['kind'], path: string, favourites: ReadonlySet<string>, recents: readonly string[]) =>
    categoryRows(li, kind === 'folder' ? { kind, path } : ({ kind } as Category), favourites, recents),
)
const filterMemo = memo((li: LibIndex, rows: number[], query: string) => filterRows(li, rows, query))
const positionMemo = memo((rows: number[]) => new Map(rows.map((r, k) => [r, k])))
const favouriteCountMemo = memo((entries: LibraryEntry[], favourites: ReadonlySet<string>) =>
  entries.reduce((n, e) => n + (favourites.has(e.path) ? 1 : 0), 0),
)
const recentCountMemo = memo((li: LibIndex, recents: readonly string[]) => recents.filter((p) => li.ix.byPath.has(p)).length)
const foldersMemo = memo((li: LibIndex) =>
  li.tops.map((t): FolderItem => ({ id: t.path, label: t.name, count: fmt(t.count), tip: 'browser.folder' })),
)

interface RowMarks {
  loaded: number
  queued: number | null
  prev: number | null
  next: number | null
  running: boolean
}

function rowOf(li: LibIndex, i: number, top: string | null, m: RowMarks, favourites: ReadonlySet<string>): ListRow {
  const e = li.ix.entries[i]
  const fav = favourites.has(e.path)
  // In a folder, the subfolder inside it; elsewhere the whole folder.
  const folder = top === null || top === '' ? e.folder : e.folder.slice(top.length + 1)
  const error = e.status === 'error'
  const pending = e.status === 'pending'
  const bpm = error ? '' : pending ? '…' : li.tempo[i]
  const time = error || pending ? '' : li.time[i]
  const file = error ? '' : pending ? '…' : (e.format ?? '—')
  const loaded = e.id === m.loaded
  const queued = e.id === m.queued
  const mark = loaded ? '●' : e.id === m.prev ? '◀' : e.id === m.next ? '▶' : undefined
  const parts = [e.name]
  if (folder) parts.push(folder)
  if (pending) parts.push('indexing')
  else if (!error) {
    if (bpm) parts.push(`${bpm} BPM`)
    if (time) parts.push(time)
  }
  if (fav) parts.push('favourite')
  if (loaded) parts.push(m.running ? 'loaded and playing' : 'loaded')
  if (queued) parts.push('loads at the next bar')
  if (e.id === m.prev) parts.push('Track left loads this')
  if (e.id === m.next) parts.push('Track right loads this')
  if (error) parts.push(`unreadable: ${e.error ?? 'unreadable'}`)
  return {
    id: String(e.id),
    cells: [fmt(i + 1), e.name, error ? (e.error ?? 'unreadable') : folder, bpm, time, file],
    name: parts.join(', '),
    mark,
    badge: queued ? 'next bar' : undefined,
    warn: error || undefined,
    star: fav,
    dim: error || pending || undefined,
  }
}

const rowsMemo = memo(
  (
    li: LibIndex,
    rows: number[],
    top: string | null,
    loaded: number,
    queued: number | null,
    prev: number | null,
    next: number | null,
    running: boolean,
    favourites: ReadonlySet<string>,
  ) => {
    const m: RowMarks = { loaded, queued, prev, next, running }
    return rows.map((i) => rowOf(li, i, top, m, favourites))
  },
)

// ── The view the props and the actions share ───────────────────────────────

interface View {
  li: LibIndex
  category: Category
  /** The category's rows before the filter, and after it. */
  all: number[]
  rows: number[]
  /** The cursor's entry index, or -1 when the list is empty. */
  cursor: number
}

function viewOf(library: LibraryList, styles: StylesCursor, prefs: StylesPrefsView): View {
  const li = libIndex(library.entries)
  const category = shownCategory(prefs.category, li)
  const all = categoryMemo(li, category.kind, category.kind === 'folder' ? category.path : '', prefs.favourites, prefs.recents)
  const rows = filterMemo(li, all, styles.query)
  // The cursor stays on its style while it is shown, else the first row.
  const at = styles.cursor === null ? undefined : li.byId.get(styles.cursor)
  const shown = at !== undefined && positionMemo(rows).has(at)
  const cursor = shown ? at : rows.length > 0 ? rows[0] : -1
  return { li, category, all, rows, cursor }
}

function shortName(name: string): string {
  return name.length > 28 ? `${name.slice(0, 27)}…` : name
}

function loadOf(e: LibraryEntry | undefined, state: AppState): StyleLoad {
  const running = state.transport.running
  if (!e) return { label: 'Load', name: 'Load: nothing to load', face: 'rest', disabled: true, queues: running }
  const label = `Load ${shortName(e.name)}`
  if (e.status === 'error')
    return { label, name: `${e.name} can't be loaded: ${e.error ?? 'unreadable'}`, face: 'rest', disabled: true, queues: running }
  if (running && e.id === state.preview?.queued)
    return { label: `${label} · next bar`, name: `${e.name} loads at the next bar (queued)`, face: 'waiting', disabled: false, queues: true }
  if (e.id === state.style.id) return { label, name: `${e.name} is loaded`, face: 'rest', disabled: true, queues: running }
  if (running) return { label: `${label} · next bar`, name: `Load ${e.name} at the next bar`, face: 'rest', disabled: false, queues: true }
  return { label, name: `Load ${e.name}`, face: 'rest', disabled: false, queues: false }
}

function emptyTextOf(state: AppState, library: LibraryList, category: Category, query: string): string {
  if (library.entries.length === 0) {
    if (state.library.count > 0) return 'Reading the library…'
    if (state.library.scanning) return 'Scanning the style folders…'
    return 'No styles yet: the library is empty.'
  }
  if (query.trim() !== '') return `No style matches “${query.trim()}”`
  if (category.kind === 'favourites') return 'No favourites yet: star a style with ☆ (or Ctrl+D).'
  if (category.kind === 'recents') return 'Nothing loaded yet.'
  return ''
}

/** LibraryStyles' data props from the app state, the library, the page's state and the prefs. */
export function stylesProps(state: AppState, library: LibraryList, styles: StylesCursor, prefs: StylesPrefsView): StylesData {
  const v = viewOf(library, styles, prefs)
  const { li, category } = v
  const entries = library.entries
  const running = state.transport.running
  const queuedId = state.preview?.queued ?? null
  const audition = state.preview?.audition ?? null
  const top = category.kind === 'folder' ? category.path : null

  const viewName =
    category.kind === 'folder'
      ? (li.tops.find((t) => t.path === category.path)?.name ?? '')
      : category.kind === 'all'
        ? 'All styles'
        : category.kind === 'favourites'
          ? 'Favourites'
          : 'Recent'

  let count: string
  if (entries.length === 0 && state.library.count > 0) count = '—'
  else {
    count = styles.query.trim() === '' ? fmt(v.all.length) : `${fmt(v.rows.length)} of ${fmt(v.all.length)}`
    if (state.library.pending > 0) count += ` · ${fmt(state.library.pending)} indexing`
  }

  const views: StyleViewTab[] = [
    { id: 'all', label: 'All', count: fmt(entries.length) },
    { id: 'favourites', label: 'Favourites', count: fmt(favouriteCountMemo(entries, prefs.favourites)) },
    { id: 'recents', label: 'Recent', count: fmt(recentCountMemo(li, prefs.recents)) },
  ]

  const surface = state.surface
  const rows = rowsMemo(
    li,
    v.rows,
    top,
    state.style.id,
    queuedId,
    surface?.trackPrev?.id ?? null,
    surface?.trackNext?.id ?? null,
    running,
    prefs.favourites,
  )

  let note = ''
  if (!running && audition) {
    const at = li.byId.get(audition.id)
    const name = at === undefined ? 'style' : entries[at].name
    note = `Previewing ${name} · bar ${audition.bar}/${audition.bars}${audition.chord ? ` · ${audition.chord}` : ''}`
  }

  const cursorEntry = v.cursor >= 0 ? entries[v.cursor] : undefined
  return {
    viewName,
    count,
    views,
    view: category.kind === 'folder' ? null : category.kind,
    folders: foldersMemo(li),
    folder: top,
    rows,
    cursor: cursorEntry ? String(cursorEntry.id) : null,
    query: styles.query,
    emptyText: emptyTextOf(state, library, category, styles.query),
    autoPreview: prefs.autoPreview,
    running,
    note,
    queued: running && queuedId !== null,
    canCancel: false,
    load: loadOf(cursorEntry, state),
    canOpenFile: false,
  }
}

/** LibraryStyles' callbacks, sending commands through `deps.send`. */
export function stylesActions(deps: StylesDeps): StylesActions {
  const { send, prefs, styles } = deps
  let timer: ReturnType<typeof setTimeout> | null = null

  const entryOf = (id: string): LibraryEntry | undefined => {
    const entries = deps.library().entries
    const at = libIndex(entries).byId.get(Number(id))
    return at === undefined ? undefined : entries[at]
  }

  function cancelDwell() {
    if (timer !== null) clearTimeout(timer)
    timer = null
  }

  /** Preview on select: after a rest on an `ok` row while stopped, audition it. */
  function dwell(e: LibraryEntry) {
    cancelDwell()
    const s = deps.state()
    if (!prefs.autoPreview || s.transport.running || !s.preview || e.status !== 'ok' || s.preview.audition?.id === e.id) return
    timer = setTimeout(() => {
      timer = null
      const now = deps.state()
      if (deps.isOpen && !deps.isOpen()) return
      if (!prefs.autoPreview || now.transport.running || styles.cursor !== e.id || now.preview?.audition?.id === e.id) return
      send({ type: 'auditionStyle', id: e.id })
    }, deps.previewDelay ?? PREVIEW_DELAY_MS)
  }

  /** Stopped: load at once and go back to the Stage. Running: queue for the next bar. */
  function load(e: LibraryEntry) {
    if (e.status === 'error') return
    const s = deps.state()
    if (s.transport.running) {
      if (e.id !== s.style.id && e.id !== s.preview?.queued) send({ type: 'queueStyle', id: e.id })
      return
    }
    if (e.id === s.style.id) return
    cancelDwell()
    send({ type: 'loadStyle', id: e.id })
    deps.close?.()
  }

  return {
    onview: (view) => prefs.setCategory({ kind: view }),
    onfolder: (id) => prefs.setCategory({ kind: 'folder', path: id }),
    onquery: (query) => {
      styles.query = query
    },
    onselect: (id) => {
      const e = entryOf(id)
      if (!e) return
      styles.cursor = e.id
      dwell(e)
    },
    onload: (id) => {
      const e = entryOf(id)
      if (!e) return
      styles.cursor = e.id
      load(e)
    },
    onpreview: (id) => {
      const e = entryOf(id)
      if (!e) return
      const s = deps.state()
      if (s.transport.running) return load(e)
      if (!s.preview || e.status !== 'ok') return
      cancelDwell()
      send(s.preview.audition?.id === e.id ? { type: 'stopAudition' } : { type: 'auditionStyle', id: e.id })
    },
    onstar: (id, on) => {
      const e = entryOf(id)
      if (e && prefs.favourites.has(e.path) !== on) prefs.toggleFavourite(e.path)
    },
    onautopreview: (on) => prefs.setAutoPreview(on),
  }
}
