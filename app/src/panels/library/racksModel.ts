// Library › Racks: app state → the LibraryRacks page's props, and its callbacks → commands.
//
//   racksProps(state: AppState, nav?: RacksNav, ui?: RacksUi): RacksData
//   racksActions(deps: RacksDeps): RacksCallbacks
//
// LibraryScreen.svelte renders it as
//   <LibraryRacks {...racksProps(app.state, libraryNav, racksState)} {...racksActions({ state: () => app.state, send: app.send })} {tipAction} />
// `nav` (the search, the Needs attention filter, the chosen rack) is libraryNav (nav.svelte.ts);
// `ui` (the delete confirm, the Save as… name, a duplicate waiting for its copy) is racksState
// (racksState.svelte.ts). Both default to those, so the screen may leave them out.

import type { ComponentProps } from 'svelte'
import { bankLetter } from '../../lib/api/quick-racks'
import type { AppCmd, AppState, OtsLinkTiming } from '../../lib/api/types'
import type LibraryRacks from '../../ui/LibraryRacks/LibraryRacks.svelte'
import type { ChosenRack, RackPartTag, StyleRacks } from '../../ui/LibraryRacks/types'
import type { ListRow } from '../../ui/ListTable/types'
import { PART_NAMES, rackName } from '../rack/rack'
import { PART_SHORT, quickButtonsOf, searchRacks } from './model'
import { libraryNav } from './nav.svelte'
import { racksState } from './racksState.svelte'

type PageProps = ComponentProps<typeof LibraryRacks>

/** The page's data props (everything but the size, `tipAction` and the callbacks). */
export type RacksData = Pick<
  PageProps,
  'count' | 'query' | 'attention' | 'attentionCount' | 'loaded' | 'missing' | 'saveAsName' | 'rows' | 'selected' | 'emptyText' | 'chosen' | 'confirming' | 'styleRacks'
>

/** The page's callbacks. */
export type RacksCallbacks = Required<
  Pick<
    PageProps,
    | 'onquery'
    | 'onattention'
    | 'onnew'
    | 'onsave'
    | 'onsaveasopen'
    | 'onsaveasname'
    | 'onsaveas'
    | 'onsaveascancel'
    | 'onselect'
    | 'onload'
    | 'onrename'
    | 'onduplicate'
    | 'onaskdelete'
    | 'oncanceldelete'
    | 'ondelete'
    | 'onotsrack'
    | 'onotslink'
    | 'onotstiming'
  >
>

/** The Racks fields of libraryNav. */
export type RacksNav = { attention: boolean; rackQuery: string; rack: string | null }

/** racksState's fields. */
export type RacksUi = { confirming: string | null; saveAsName: string | null; dupBefore: string[] | null }

export type RacksDeps = {
  state: () => AppState
  send: (cmd: AppCmd) => void
  /** Default libraryNav. */
  nav?: RacksNav
  /** Default racksState. */
  ui?: RacksUi
}

/** The rack the details show: a duplicate's new copy, else the one chosen (if it still
 * exists), else the loaded rack's own (if it's saved); null: none. */
export function chosenRackId(state: AppState, nav: RacksNav, ui: RacksUi): string | null {
  const racks = state.racks
  if (ui.dupBefore) {
    const before = ui.dupBefore
    const copy = racks.find((r) => !before.includes(r.id))
    if (copy) return copy.id
  }
  if (nav.rack !== null && racks.some((r) => r.id === nav.rack)) return nav.rack
  const live = state.liveRack.id
  return live !== null && racks.some((r) => r.id === live) ? live : null
}

/** "Quick Rack A4", "Quick Racks A1, A3". */
const quickRacks = (slots: string[]) => `Quick Rack${slots.length === 1 ? '' : 's'} ${slots.join(', ')}`

function chosenRack(state: AppState, id: string | null): ChosenRack | null {
  const r = id === null ? undefined : state.racks.find((x) => x.id === id)
  if (!r) return null
  const slots = quickButtonsOf(state.quickRacks, r.id)
  const bank = bankLetter(state.quickRacks.bank)
  const ots = state.ots.racks.flatMap((o, i) => (o.rack === r.id && !o.missing ? [i + 1] : []))
  const otsNote = ots.length ? ` One Touch ${ots.join(', ')} ${ots.length === 1 ? 'goes' : 'go'} back to the style's own.` : ''
  return {
    id: r.id,
    name: r.name,
    loaded: r.id === state.liveRack.id,
    subtitle: slots.length ? quickRacks(slots) : `Not on a Quick Rack in bank ${bank}`,
    parts: PART_SHORT.map((tag, i) => ({ tag: tag as RackPartTag, name: r.parts[i] ?? '', on: !!r.on[i] })),
    deleteNote: (slots.length ? `${quickRacks(slots)} will be empty.` : `No Quick Rack in bank ${bank} holds it.`) + otsNote,
  }
}

function styleRacks(state: AppState): StyleRacks {
  const ots = state.ots
  return {
    style: state.style.name,
    slots: ots.settings.slice(0, 4).map((_, i) => ({ rack: ots.racks[i]?.rack ?? null, missing: ots.racks[i]?.missing ?? false })),
    racks: state.racks.map((r) => ({ id: r.id, name: r.name })),
    applied: ots.applied,
    link: ots.link,
    timing: ots.linkTiming,
    readOnly: ots.racksReadOnly,
  }
}

/** The page's data props from the app state and the page's app-only state. */
export function racksProps(state: AppState, nav: RacksNav = libraryNav, ui: RacksUi = racksState): RacksData {
  const live = state.liveRack
  const attention = state.plugins.needsAttention
  const filtered = nav.attention && attention.length > 0
  const attentionIds = new Set(attention.map((a) => a.id))
  const pool = filtered ? state.racks.filter((r) => r.needsAttention || attentionIds.has(r.id)) : state.racks
  const query = nav.rackQuery.trim()
  const rows: ListRow[] = searchRacks(pool, nav.rackQuery).map((r) => ({
    id: r.id,
    cells: [r.name, r.parts.filter((_, i) => r.on[i]).join(' · '), quickButtonsOf(state.quickRacks, r.id).join(' ')],
    warn: r.needsAttention || attentionIds.has(r.id),
  }))
  const missing = state.keyboardParts.flatMap((p, i) => (p.plugin?.missing ? [{ part: PART_NAMES[i], plugin: p.plugin.name }] : []))
  const id = chosenRackId(state, nav, ui)
  const name = rackName(live)
  return {
    count: state.racks.length,
    query: nav.rackQuery,
    attention: filtered,
    attentionCount: attention.length,
    loaded: {
      name,
      modified: live.modified,
      missing: missing.length > 0,
      slot: live.id === null ? '' : quickButtonsOf(state.quickRacks, live.id).join(' '),
      canSave: live.modified || live.id === null,
    },
    missing,
    saveAsName: ui.saveAsName,
    rows,
    selected: id,
    emptyText: query ? `No racks match “${query}”.` : filtered ? 'No racks need attention.' : `No racks yet. Save the live rack (${name}) to make one.`,
    chosen: chosenRack(state, id),
    confirming: id !== null && ui.confirming === id && id !== live.id,
    styleRacks: styleRacks(state),
  }
}

/** The page's callbacks, as commands and changes to the page's app-only state. */
export function racksActions(deps: RacksDeps): RacksCallbacks {
  const { state, send } = deps
  const nav = deps.nav ?? libraryNav
  const ui = deps.ui ?? racksState
  const chosen = () => chosenRackId(state(), nav, ui)
  return {
    onquery: (q) => {
      nav.rackQuery = q
    },
    onattention: (on) => {
      nav.attention = on
    },
    onnew: () => send({ type: 'newRack' }),
    onsave: () => {
      const live = state().liveRack
      if (live.modified || live.id === null) send({ type: 'saveRack' })
    },
    onsaveasopen: () => {
      const live = state().liveRack
      ui.saveAsName = ui.saveAsName !== null ? null : live.id === null ? rackName(live) : `${live.name} copy`
    },
    onsaveasname: (name) => {
      ui.saveAsName = name
    },
    onsaveas: (name) => {
      const n = name.trim()
      if (!n) return
      send({ type: 'saveRackAs', name: n })
      ui.saveAsName = null
      ui.dupBefore = null
    },
    onsaveascancel: () => {
      ui.saveAsName = null
    },
    onselect: (id) => {
      nav.rack = id
      ui.confirming = null
      ui.dupBefore = null
    },
    onload: (id) => send({ type: 'loadRack', id }),
    onrename: (name) => {
      const id = chosen()
      const n = name.trim()
      const r = state().racks.find((x) => x.id === id)
      if (id !== null && n && r && n !== r.name) send({ type: 'renameRack', id, name: n })
    },
    onduplicate: () => {
      const id = chosen()
      if (id === null) return
      nav.rack = id
      ui.confirming = null
      ui.dupBefore = state().racks.map((r) => r.id)
      send({ type: 'duplicateRack', id })
    },
    onaskdelete: () => {
      const id = chosen()
      if (id !== null && id !== state().liveRack.id) ui.confirming = id
    },
    oncanceldelete: () => {
      ui.confirming = null
    },
    ondelete: () => {
      const id = chosen()
      ui.confirming = null
      if (id === null || id === state().liveRack.id) return
      send({ type: 'deleteRack', id })
      nav.rack = null
      ui.dupBefore = null
    },
    onotsrack: (index, id) => send(id ? { type: 'setOtsRack', index, id } : { type: 'clearOtsRack', index }),
    onotslink: (on) => send({ type: 'setOtsLink', on }),
    onotstiming: (timing) => send({ type: 'setOtsLinkTiming', timing: timing as OtsLinkTiming }),
  }
}
