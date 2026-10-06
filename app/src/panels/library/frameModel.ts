// The Library screen's frame (ui/Library): the Library page tabs with their counts, the compact
// now-playing block and the Quick Racks bar, from app state. Pure, so it is unit-tested; the
// pages' own props come from stylesModel, soundsModel, instrumentsModel and racksModel.

import type { ComponentProps } from 'svelte'
import type { AppState, LibraryList, SoundCatalog } from '../../lib/api/types'
import type { LibraryTab } from '../../lib/store.svelte'
import type { TabItem } from '../../ui/ChosenTabs/types'
import type NowPlayingCompact from '../../ui/NowPlayingCompact/NowPlayingCompact.svelte'
import type { QuickSlot } from '../../ui/QuickRacksBar/types'
import { instruments } from '../sounds/model'
import { nowPlayingCompact } from '../settings/model'
import { librarySounds, NO_FILTER } from './model'

/** The Library pages, left to right, and their tooltip keys. */
export const LIBRARY_PAGES: { id: LibraryTab; label: string; tip: string }[] = [
  { id: 'styles', label: 'Styles', tip: 'library.tab_styles' },
  { id: 'sounds', label: 'Sounds', tip: 'library.tab_sounds' },
  { id: 'instruments', label: 'Instruments', tip: 'library.tab_instruments' },
  { id: 'racks', label: 'Racks', tip: 'library.tab_racks' },
  { id: 'map', label: 'Style map', tip: 'library.tab_map' },
]

const count = (n: number) => n.toLocaleString('en-US')

/** The page tabs, each with its count ("Styles 1,284"); Style map has none. */
export function libraryPages(state: AppState, library: LibraryList, catalog: SoundCatalog): TabItem[] {
  const ctx = { patches: state.soundLibrary.patches, gmMap: state.soundLibrary.gmMap ?? [] }
  const n: Partial<Record<LibraryTab, number>> = {
    styles: library.entries.length,
    sounds: librarySounds(catalog, NO_FILTER, ctx).length,
    instruments: instruments(catalog).length + state.plugins.missing.length,
    racks: state.racks.length,
  }
  return LIBRARY_PAGES.map((p) => {
    const c = n[p.id]
    return c === undefined
      ? { id: p.id, label: p.label, tip: p.tip }
      : { id: p.id, label: `${p.label} ${count(c)}`, name: `${p.label}, ${count(c)}`, tip: p.tip }
  })
}

/** The left column's compact block, as on Settings: style, tempo, running, the chord, the section. */
export function compactNowPlaying(state: AppState): ComponentProps<typeof NowPlayingCompact> {
  return nowPlayingCompact(state)
}

/** The Quick Racks bar: the bank on view, its eight slots, Store armed, Clear armed (app-only). */
export function quickRacksBar(state: AppState, clear: boolean): {
  bank: string
  bankCount: number
  slots: QuickSlot[]
  store: boolean
  clear: boolean
  readOnly: boolean
} {
  const q = state.quickRacks
  return {
    bank: 'ABCDEFGH'[q.bank] ?? 'A',
    bankCount: 8,
    slots: q.buttons.map((b, i) => ({
      label: String(i + 1),
      name: b.name,
      state: b.rack === null ? 'empty' : b.missing ? 'missing' : b.loaded ? 'loaded' : 'stored',
      tip: `quick.${i + 1}`,
    })),
    store: q.store,
    clear,
    readOnly: q.readOnly,
  }
}
