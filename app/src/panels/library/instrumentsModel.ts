// Library › Instruments (LibraryInstruments): app state in, the page's props out; the page's
// callbacks in, commands out. Pure, so it is unit-tested with a fake `send`.
//
//   instrumentsProps(state: AppState, catalog: SoundCatalog, st: InstrumentsPageState, part: number): InstrumentsProps
//   instrumentsActions(deps: InstrumentsDeps): InstrumentsActions
//   followPendingEditor(state: AppState, part: number, st: InstrumentsPageState, openEditor: (part: number) => void): void
//
// The wiring (LibraryScreen.svelte):
//   <LibraryInstruments {...instrumentsProps(app.state, app.sounds, instrumentsState, ui.libraryPart)}
//     {...instrumentsActions({ state: () => app.state, catalog: () => app.sounds, send: (c) => app.send(c),
//       part: () => ui.libraryPart, st: instrumentsState,
//       browseSounds: (id) => { libraryNav.instrument = id; libraryNav.source = 'all'; libraryNav.favourites = false;
//         libraryNav.category = null; libraryNav.query = ''; <show the Sounds page> },
//       showRacks: () => { libraryNav.attention = true; <show the Racks page> },
//       replaceOnPart: (p) => { ui.libraryPart = p; <show the Sounds page> },
//       openEditor: (p) => app.pluginEditor(p, true) })} {tipAction} />
//   $effect(() => followPendingEditor(app.state, ui.libraryPart, instrumentsState, (p) => app.pluginEditor(p, true)))
//
// Row ids: `au:<component>` (an installed plugin), `missing:<component>` (a plugin that isn't
// installed), `font:<file>` (a SoundFont). browseSounds gets the Sounds page's instrument
// filter id: `au:<component>` or `sf:<file>`.

import type { DetailField, DetailHue } from '../../ui/DetailPanel/types'
import type { InstrumentDetail, InstrumentRow, InstrumentShow } from '../../ui/LibraryInstruments/types'
import type { AppCmd, AppState, MissingPlugin, PluginEntry, SoundCatalog } from '../../lib/api/types'
import { fontLine, instruments, pluginLoads, scanLine } from '../sounds/instruments'
import { instrumentName, type SoundContext } from '../sounds/model'

/** The app-only state the page reads and writes (InstrumentsState). */
export interface InstrumentsPageState {
  show: InstrumentShow
  chosen: string | null
  pendingEditor: string | null
}

/** LibraryInstruments' data props. */
export interface InstrumentsProps {
  summary: string
  show: InstrumentShow
  attention: number
  rows: InstrumentRow[]
  selected: string | null
  detail: InstrumentDetail | null
  canRescan: boolean
  scanning: boolean
  folder: string
  hint: string
}

/** LibraryInstruments' callbacks. */
export interface InstrumentsActions {
  onshow: (show: InstrumentShow) => void
  onchoose: (id: string) => void
  onrescan: () => void
  onbrowse: (id: string) => void
  onnewsound: (id: string) => void
  onedit: (id: string) => void
  onreplace: (id: string) => void
  onshowracks: (id: string) => void
  oninprocess: (id: string, on: boolean) => void
}

export interface InstrumentsDeps {
  state: () => AppState
  catalog: () => SoundCatalog
  send: (cmd: AppCmd) => void
  /** The part Library loads into (ui.libraryPart). */
  part: () => number
  st: InstrumentsPageState
  /** Show the Sounds page filtered to this instrument (`au:<component>` or `sf:<file>`). */
  browseSounds: (instrumentId: string) => void
  /** Show the Racks page with Needs attention on. */
  showRacks: () => void
  /** Show the Sounds page loading into keyboard part `part` (0-3), to replace its sound. */
  replaceOnPart: (part: number) => void
  /** Open the plugin window of keyboard part `part`. */
  openEditor: (part: number) => void
}

const SHORT = ['R1', 'R2', 'R3', 'L']
const LONG = ['Right 1', 'Right 2', 'Right 3', 'Left']
const HUE: DetailHue[] = ['r1', 'r2', 'r3', 'l']

export const HINT = 'Drop a .sf2 in the SoundFont folder; it shows here the next time yahaha starts. Audio Units come from Rescan.'

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`
const fontName = (f: string) => f.replace(/\.sf2$/i, '')

type Item =
  | { kind: 'plugin'; id: string; plugin: PluginEntry; status: string; parts: number[] }
  | { kind: 'missing'; id: string; plugin: MissingPlugin; parts: number[] }
  | { kind: 'font'; id: string; file: string; name: string; line: string; presets: number; sounds: number; parts: number[] }

function items(state: AppState, catalog: SoundCatalog): Item[] {
  const plugins = state.plugins
  const list = instruments(catalog, plugins.list)
  const listing = new Set(state.sounds?.listingPresets ?? [])
  const parts = state.keyboardParts
  const ctx: SoundContext = { patches: state.soundLibrary?.patches ?? [], gmMap: state.soundLibrary?.gmMap ?? [] }
  const out: Item[] = []
  // New plugins first, then the catalog's order (by maker, then name).
  const pluginItems = list.flatMap((i) => (i.kind === 'plugin' ? [i] : [])).sort((a, b) => Number(b.plugin.new) - Number(a.plugin.new))
  for (const inst of pluginItems) {
    const p = inst.plugin
    const on = pluginLoads(parts, p.id).map((l) => l.part)
    const status = p.lastError ? `failed: ${p.lastError}` : on.length ? `In use on ${on.map((i) => SHORT[i]).join(' ')}` : p.new ? 'not opened yet' : scanLine(p, inst.entry, listing.has(inst.id))
    out.push({ kind: 'plugin', id: `au:${p.id}`, plugin: p, status, parts: on })
  }
  for (const m of plugins.missing) {
    out.push({ kind: 'missing', id: `missing:${m.id}`, plugin: m, parts: parts.flatMap((k, i) => (k.plugin?.id === m.id ? [i] : [])) })
  }
  for (const inst of list) {
    if (inst.kind !== 'font') continue
    const file = inst.font.file
    const name = fontName(file)
    const on = parts.flatMap((k, i) => ((!k.plugin || k.plugin.status === 'failed') && instrumentName(k, ctx, plugins.list, state.io.soundFontFile) === name ? [i] : []))
    const sounds = ctx.patches.filter((p) => p.source.kind === 'soundFont' && p.source.file === file).length
    out.push({ kind: 'font', id: `font:${file}`, file, name, line: fontLine(inst.font), presets: inst.font.presets, sounds, parts: on })
  }
  return out
}

function needsAttention(i: Item): boolean {
  return i.kind === 'missing' || (i.kind === 'plugin' && !!i.plugin.lastError)
}

function row(i: Item): InstrumentRow {
  if (i.kind === 'plugin') {
    const p = i.plugin
    return { id: i.id, kind: 'AU', name: p.name, status: i.status, sounds: String(p.sounds), racks: String(p.racks), fresh: p.new, failed: !!p.lastError }
  }
  if (i.kind === 'missing') {
    const m = i.plugin
    return { id: i.id, kind: 'AU', name: m.name || m.id, status: 'Missing', sounds: String(m.sounds), racks: String(m.racks), missing: true }
  }
  const status = i.parts.length ? `In use on ${i.parts.map((p) => SHORT[p]).join(' ')}` : plural(i.presets, 'preset')
  return { id: i.id, kind: 'SF', name: i.name, status, sounds: String(i.sounds), racks: '—' }
}

function playingOn(parts: number[]): DetailField[] {
  return parts.length ? [{ label: 'Playing on', values: parts.map((p) => ({ text: LONG[p], hue: HUE[p] })) }] : []
}

function detailOf(i: Item, state: AppState, part: number): InstrumentDetail {
  if (i.kind === 'plugin') {
    const p = i.plugin
    const loads = pluginLoads(state.keyboardParts, p.id)
    return {
      id: i.id,
      title: p.name,
      badge: 'AU',
      subtitle: [p.manufacturer, p.version ? `version ${p.version}` : ''].filter(Boolean).join(' · '),
      fields: [
        { label: 'My Sounds', values: [{ text: String(p.sounds) }] },
        { label: 'In racks', values: [{ text: String(p.racks) }] },
        ...playingOn(i.parts),
        ...(p.lastError ? [{ label: 'Last load', values: [{ text: `failed: ${p.lastError}`, hue: 'warn' as const }] }] : []),
      ],
      inProcess: p.canRunInProcess ? p.inProcess : null,
      canBrowse: true,
      newSound: state.plugins.available ? { part: state.keyboardParts[part]?.name ?? LONG[part] ?? 'the part' } : null,
      edit: { enabled: loads.some((l) => l.editor && l.status === 'playing') },
      replace: null,
      showRacks: false,
    }
  }
  if (i.kind === 'missing') {
    const m = i.plugin
    return {
      id: i.id,
      title: m.name || m.id,
      badge: 'AU',
      subtitle: [m.manufacturer, 'not found by the last scan'].filter(Boolean).join(' · '),
      fields: [
        { label: 'My Sounds', values: [{ text: String(m.sounds) }] },
        { label: 'In racks', values: [{ text: String(m.racks) }] },
        ...(i.parts.length
          ? [{ label: 'Silent on', values: i.parts.map((p) => ({ text: LONG[p], hue: HUE[p] })) }]
          : [{ label: 'Status', values: [{ text: 'Missing', hue: 'warn' as const }] }]),
      ],
      inProcess: null,
      canBrowse: false,
      newSound: null,
      edit: null,
      replace: { enabled: i.parts.length > 0 },
      showRacks: true,
    }
  }
  return {
    id: i.id,
    title: i.name,
    badge: 'SoundFont',
    subtitle: i.line,
    fields: [{ label: 'My Sounds', values: [{ text: String(i.sounds) }] }, ...playingOn(i.parts)],
    inProcess: null,
    canBrowse: true,
    newSound: null,
    edit: null,
    replace: null,
    showRacks: false,
  }
}

function shown(i: Item, show: InstrumentShow): boolean {
  if (show === 'plugins') return i.kind !== 'font'
  if (show === 'fonts') return i.kind === 'font'
  if (show === 'attention') return needsAttention(i)
  return true
}

/** The page's data props. The chosen row is `st.chosen` when it's shown, else the first row. */
export function instrumentsProps(state: AppState, catalog: SoundCatalog, st: InstrumentsPageState, part: number): InstrumentsProps {
  const all = items(state, catalog)
  const visible = all.filter((i) => shown(i, st.show))
  const chosen = visible.find((i) => i.id === st.chosen) ?? visible[0] ?? null
  const plugins = all.filter((i) => i.kind !== 'font').length
  const fonts = all.length - plugins
  return {
    summary: `${plural(plugins, 'plugin')}, ${plural(fonts, 'SoundFont')}`,
    show: st.show,
    attention: all.filter(needsAttention).length,
    rows: visible.map(row),
    selected: chosen?.id ?? null,
    detail: chosen ? detailOf(chosen, state, part) : null,
    canRescan: state.plugins.available,
    scanning: state.plugins.scanning,
    folder: state.io.soundFonts.join(', '),
    hint: HINT,
  }
}

/** The page's callbacks, as commands and navigation. */
export function instrumentsActions(deps: InstrumentsDeps): InstrumentsActions {
  const plugin = (id: string) => (id.startsWith('au:') ? deps.state().plugins.list.find((p) => p.id === id.slice(3)) : undefined)
  const seen = (p: PluginEntry | undefined) => {
    if (p?.new) deps.send({ type: 'markPluginSeen', id: p.id })
  }
  return {
    onshow: (show) => {
      deps.st.show = show
    },
    onchoose: (id) => {
      deps.st.chosen = id
      seen(plugin(id))
    },
    onrescan: () => {
      if (!deps.state().plugins.scanning) deps.send({ type: 'rescanPlugins' })
    },
    onbrowse: (id) => {
      if (id.startsWith('font:')) deps.browseSounds(`sf:${id.slice(5)}`)
      else if (id.startsWith('au:')) {
        seen(plugin(id))
        deps.browseSounds(id)
      }
    },
    onnewsound: (id) => {
      const p = plugin(id)
      if (!p) return
      seen(p)
      deps.send({ type: 'setPartPlugin', part: deps.part(), id: p.id, state: null })
      deps.st.pendingEditor = p.id
    },
    onedit: (id) => {
      const p = plugin(id)
      if (!p) return
      const loads = pluginLoads(deps.state().keyboardParts, p.id).filter((l) => l.editor && l.status === 'playing')
      const at = loads.find((l) => l.part === deps.part()) ?? loads[0]
      if (at) deps.openEditor(at.part)
    },
    onreplace: (id) => {
      if (!id.startsWith('missing:')) return
      const comp = id.slice(8)
      const parts = deps.state().keyboardParts.flatMap((k, i) => (k.plugin?.id === comp ? [i] : []))
      const at = parts.includes(deps.part()) ? deps.part() : parts[0]
      if (at !== undefined) deps.replaceOnPart(at)
    },
    onshowracks: () => deps.showRacks(),
    oninprocess: (id, on) => {
      const p = plugin(id)
      if (p) deps.send({ type: 'setPluginInProcess', id: p.id, inProcess: on })
    },
  }
}

/** + New sound's second half: once the target part plays the pending plugin, open its window
 * (if it has one) and forget it; a load that ends any other way forgets it too. Call it from
 * an `$effect`. */
export function followPendingEditor(state: AppState, part: number, st: InstrumentsPageState, openEditor: (part: number) => void): void {
  const pl = state.keyboardParts[part]?.plugin
  if (!st.pendingEditor || !pl || pl.id !== st.pendingEditor) return
  if (pl.status === 'playing') {
    if (pl.editor) openEditor(part)
    st.pendingEditor = null
  } else if (pl.status !== 'loading') st.pendingEditor = null
}
