// Library › Sounds for the new Library screen: app state into LibrarySounds' props, and its
// callbacks into commands. The filters live in libraryNav (nav.svelte.ts), the page's own
// state (the row moved to, the Save as… form, the delete confirm) in soundsPage
// (soundsState.svelte.ts), the target part in `ui.libraryPart`.
//
//   <LibrarySounds
//     {...soundsProps(app.state, app.sounds, ui.libraryPart, libraryNav, soundsPage)}
//     {...soundsActions({ state: () => app.state, catalog: () => app.sounds, part: () => ui.libraryPart,
//                         send: (c) => app.send(c), setPart: (i) => (ui.libraryPart = i), nav: libraryNav, page: soundsPage })}
//     {tipAction} />
//
// Plus one effect: `const id = presetsToList(app.state, app.sounds, libraryNav)` and, when it
// isn't null, `app.send({ type: 'listPluginPresets', id })` (Instruments › Browse on a plugin
// lists its factory presets once).

import type { ComponentProps } from 'svelte'
import { parsePresetId } from '../../lib/api/sounds'
import type { AppCmd, AppState, GmMapRow, PatchCategory, PatchInfo, SoundCatalog, SoundEntry } from '../../lib/api/types'
import type { ListRow } from '../../ui/ListTable/types'
import type LibrarySounds from '../../ui/LibrarySounds/LibrarySounds.svelte'
import type LibrarySoundsSave from '../../ui/LibrarySounds/LibrarySoundsSave.svelte'
import type { SoundDetail, SoundSaveAs, SoundSourceTab } from '../../ui/LibrarySounds/types'
import { inMySounds } from '../sounds/instruments'
import { instrumentOf, patchesById, presetFileName, soundNumber, type SoundContext } from '../sounds/model'
import { BADGE_LABEL, PART_SHORT, badgeOf, instrumentNames, libraryCategories, librarySounds, playingByPart, type SoundFilter } from './model'

/** The page's props plus its Save / Save as… in the Library header (LibrarySoundsSave). */
type Props = ComponentProps<typeof LibrarySounds> & ComponentProps<typeof LibrarySoundsSave>
/** LibrarySounds' data props (everything but the callbacks, the tooltip action and the size). */
export type SoundsData = Pick<
  Props,
  | 'partNames'
  | 'part'
  | 'edited'
  | 'saveAs'
  | 'canPreset'
  | 'query'
  | 'source'
  | 'instrument'
  | 'categories'
  | 'category'
  | 'rows'
  | 'selected'
  | 'emptyText'
  | 'detail'
  | 'running'
  | 'confirmDelete'
>
/** LibrarySounds' callbacks. */
export type SoundsCallbacks = Required<
  Pick<
    Props,
    | 'onquery'
    | 'onsource'
    | 'onpart'
    | 'onclearinstrument'
    | 'oncategory'
    | 'onselect'
    | 'onstar'
    | 'onsave'
    | 'onsaveasopen'
    | 'onsaveasedit'
    | 'onsaveas'
    | 'onsaveascancel'
    | 'onaudition'
    | 'onuse'
    | 'oncopy'
    | 'onduplicate'
    | 'onmove'
    | 'onaskdelete'
    | 'oncanceldelete'
    | 'ondelete'
    | 'onsetcategory'
  >
>

/** The page's own state (soundsPage in soundsState.svelte.ts, or a plain object in tests). */
export interface SoundsPageLike {
  selected: string | null
  saveAs: SoundSaveAs | null
  confirmDelete: boolean
}

/** What the actions need. `nav` and `page` are written to. */
export interface SoundsDeps {
  state: () => AppState
  catalog: () => SoundCatalog
  /** The target part (`ui.libraryPart`). */
  part: () => number
  send: (cmd: AppCmd) => void
  /** Sets the target part (`ui.libraryPart = i`). */
  setPart: (i: number) => void
  nav: SoundFilter
  page: SoundsPageLike
}

// One empty GM map, so an engine without one doesn't make a new array per call (the memos
// below key on its identity).
const NO_ROWS: GmMapRow[] = []

function contextOf(state: AppState): SoundContext {
  return { patches: state.soundLibrary.patches, gmMap: state.soundLibrary.gmMap ?? NO_ROWS }
}

/** An instrument's name by id; a font's file or a plugin's id when the catalog doesn't name it. */
function instName(catalog: SoundCatalog, id: string | null): string {
  return id ? (instrumentNames(catalog).get(id) ?? id.replace(/^(sf|au):/, '').replace(/\.sf2$/i, '')) : ''
}

/** Why a sound can't play now: a plugin that failed to load, or a saved sound that falls back. */
function problemOf(e: SoundEntry, patch: PatchInfo | undefined): string | undefined {
  if (e.plugin?.lastError) return `Failed to load: ${e.plugin.lastError}`
  if (patch && !patch.available) return patch.note ?? 'Not available: plays the SoundFont voice'
  return undefined
}

/** The last rows built: the same list, catalog, patches and parts give the same array. */
let rowsMemo: { indices: number[]; catalog: SoundCatalog; patches: PatchInfo[]; playing: string; rows: ListRow[] } | null = null

function buildRows(catalog: SoundCatalog, indices: number[], byId: Map<string, PatchInfo>, patches: PatchInfo[], playing: (string | null)[]): ListRow[] {
  const key = playing.join('\n')
  const m = rowsMemo
  if (m && m.indices === indices && m.catalog === catalog && m.patches === patches && m.playing === key) return m.rows
  const HUE = ['r1', 'r2', 'r3', 'l'] as const
  const rows = indices.map((i): ListRow => {
    const e = catalog.entries[i]
    const n = soundNumber(e, byId)
    const on = playing.flatMap((p, k) => (p === e.id ? [k] : []))
    return {
      id: e.id,
      cells: [n === null ? '—' : String(n), e.name, instName(catalog, instrumentOf(e, byId)), BADGE_LABEL[badgeOf(e)]],
      badge: on.length ? on.map((k) => PART_SHORT[k]).join(' ') : undefined,
      badgeHue: on.length ? HUE[on[0]] : undefined,
      warn: problemOf(e, byId.get(e.id)) !== undefined,
      star: e.favourite,
    }
  })
  rowsMemo = { indices, catalog, patches, playing: key, rows }
  return rows
}

/** The plugin whose presets Instruments › Browse needs listed now (once; a failed listing isn't
 * tried again), or null. The wiring sends `listPluginPresets` for it from an effect. */
export function presetsToList(state: AppState, catalog: SoundCatalog, nav: Pick<SoundFilter, 'instrument'>): string | null {
  const id = nav.instrument
  if (!id?.startsWith('au:')) return null
  if (state.sounds?.listingPresets?.includes(id)) return null
  const e = catalog.entries.find((x) => x.id === id)
  return e?.plugin && !e.plugin.lastError && !e.plugin.presetsError ? id : null
}

/** LibrarySounds' data props from the app state, the catalog, the target part and the filters. */
export function soundsProps(state: AppState, catalog: SoundCatalog, part: number, nav: SoundFilter, page: SoundsPageLike): SoundsData {
  const ctx = contextOf(state)
  const filter: SoundFilter = { source: nav.source, favourites: nav.favourites, instrument: nav.instrument, category: nav.category, query: nav.query }
  const indices = librarySounds(catalog, filter, ctx)
  const parts = state.keyboardParts
  const playing = playingByPart(parts, ctx)
  const byId = patchesById(ctx.patches)
  const kp = parts[part]
  const selected = page.selected ?? playing[part] ?? null
  const entry = selected ? catalog.entries.find((e) => e.id === selected) : undefined

  let detail: SoundDetail | null = null
  if (entry) {
    const patch = byId.get(entry.id)
    const idx = patch ? ctx.patches.indexOf(patch) : -1
    const inst = instName(catalog, instrumentOf(entry, byId))
    const badge = badgeOf(entry)
    detail = {
      id: entry.id,
      number: patch ? String(patch.number) : undefined,
      name: entry.name,
      badge,
      instrument: entry.detail && entry.detail !== inst ? (inst ? `${inst} · ${entry.detail}` : entry.detail) : inst,
      category: entry.category,
      categoryEditable: entry.source !== 'soundFont',
      playingOn: playing.flatMap((p, k) => (p === entry.id ? [k] : [])),
      inMySounds: badge === 'mine' || inMySounds(ctx.patches, entry.id),
      canAudition: !!patch || (entry.source === 'soundFont' && parsePresetId(entry.id) !== null),
      canMoveUp: idx > 0,
      canMoveDown: idx >= 0 && idx < ctx.patches.length - 1,
      warn: problemOf(entry, patch),
    }
  }

  const instrument = nav.instrument ? instName(catalog, nav.instrument) : null
  const listError = nav.instrument ? catalog.entries.find((e) => e.id === nav.instrument)?.plugin?.presetsError : undefined
  const emptyText =
    catalog.entries.length === 0
      ? 'No sounds yet: no SoundFonts, plugins or saved sounds.'
      : nav.instrument && state.sounds?.listingPresets?.includes(nav.instrument)
        ? `Listing ${instrument}'s presets…`
        : listError
          ? `Could not list ${instrument}'s presets: ${listError}`
          : 'No sounds match. Clear a filter, or make one from Instruments.'

  return {
    partNames: parts.map((p) => p.name),
    part,
    edited: !!kp?.soundEdited,
    saveAs: page.saveAs,
    canPreset: kp?.plugin?.status === 'playing',
    query: nav.query,
    source: (nav.favourites ? 'starred' : nav.source) as SoundSourceTab,
    instrument,
    categories: libraryCategories(catalog, filter, ctx),
    category: nav.category,
    rows: buildRows(catalog, indices, byId, ctx.patches, playing),
    selected,
    emptyText,
    detail,
    running: state.transport.running,
    confirmDelete: page.confirmDelete && !!detail && detail.badge === 'mine',
  }
}

/** LibrarySounds' callbacks: each sends its command (or sets the filters and page state). */
export function soundsActions(d: SoundsDeps): SoundsCallbacks {
  const patchOf = (id: string) => patchesById(d.state().soundLibrary.patches).get(id)
  const assign = (id: string) => {
    d.page.selected = id
    d.page.confirmDelete = false
    d.send({ type: 'assignSound', part: d.part(), id })
  }
  return {
    onquery: (q) => (d.nav.query = q),
    onsource: (s) => {
      d.nav.favourites = s === 'starred'
      d.nav.source = s === 'starred' ? 'all' : s
    },
    onpart: (i) => {
      d.page.selected = null
      d.page.saveAs = null
      d.page.confirmDelete = false
      d.setPart(i)
    },
    onclearinstrument: () => (d.nav.instrument = null),
    oncategory: (c) => (d.nav.category = c as PatchCategory | null),
    onselect: assign,
    onuse: assign,
    onstar: (id, on) => d.send({ type: 'setSoundFavourite', id, on }),
    onsave: () => d.send({ type: 'saveSound', part: d.part() }),
    onsaveasopen: () => {
      const kp = d.state().keyboardParts[d.part()]
      const cur = kp?.sound ? d.state().soundLibrary.patches.find((p) => `saved:${p.id}` === kp.sound!.id || p.id === kp.sound!.id) : undefined
      d.page.saveAs = { name: kp?.sound?.name ?? kp?.voiceName ?? '', aupreset: false, category: cur?.category ?? 'synthLead', replace: false }
    },
    onsaveasedit: (change) => {
      if (d.page.saveAs) d.page.saveAs = { ...d.page.saveAs, ...change, replace: false }
    },
    onsaveas: (overwrite) => {
      const form = d.page.saveAs
      const name = form?.name.trim()
      if (!form || !name) return
      const part = d.part()
      const kp = d.state().keyboardParts[part]
      if (form.aupreset && kp?.plugin?.status === 'playing') {
        const parent = `au:${kp.plugin.id}`
        const file = presetFileName(name).toLowerCase()
        const clash = d.catalog().entries.some((e) => e.parent === parent && e.id.startsWith(`${parent}#u:`) && e.name.toLowerCase() === file)
        if (clash && !overwrite) {
          d.page.saveAs = { ...form, replace: true }
          return
        }
        d.send({ type: 'savePartAsPluginPreset', part, name, category: form.category as PatchCategory, overwrite })
      }
      d.send({ type: 'saveSoundAs', part, name })
      d.page.saveAs = null
    },
    onsaveascancel: () => {
      const form = d.page.saveAs
      d.page.saveAs = form?.replace ? { ...form, replace: false } : null
    },
    onaudition: (id) => {
      if (d.state().transport.running) return
      const patch = patchOf(id)
      if (patch) return d.send({ type: 'auditionPatch', id: patch.id })
      const pre = parsePresetId(id)
      if (pre) d.send({ type: 'auditionPreset', file: pre.file, bank: pre.bank, program: pre.program })
    },
    oncopy: (id) => d.send({ type: 'addToMySounds', id }),
    onduplicate: (id) => {
      const patch = patchOf(id)
      if (patch) d.send({ type: 'duplicatePatch', id: patch.id })
    },
    onmove: (id, by) => {
      const patches = d.state().soundLibrary.patches
      const patch = patchOf(id)
      const to = patch ? patches.indexOf(patch) + by : -1
      if (patch && to >= 0 && to < patches.length) d.send({ type: 'movePatch', id: patch.id, to })
    },
    onaskdelete: () => (d.page.confirmDelete = true),
    oncanceldelete: () => (d.page.confirmDelete = false),
    ondelete: (id) => {
      const patch = patchOf(id)
      d.page.confirmDelete = false
      if (!patch) return
      d.page.selected = null
      d.send({ type: 'deletePatch', id: patch.id })
    },
    onsetcategory: (id, category) => d.send({ type: 'setSoundCategory', id, category: category as PatchCategory }),
  }
}
