// The app bar's quick-nav strip: one button per panel and drawer, each with an Alt+letter
// shortcut (README's terminal keys use every plain letter). The buttons reuse the ui
// store's own open/close state, or the Stage's page tab (`stagePage`) for a display page;
// nothing here owns a panel.

import type { TipKey } from '../help/tooltips'
import { stagePage } from '../panels/stage/page.svelte'
import { app, ui, type LibraryTab } from './store.svelte'

export interface NavItem {
  tip: TipKey
  label: string
  /** README notation, `alt+<letter>` (matched by physical key). */
  key: string
  open: () => boolean
  toggle: () => void
  /** A shortcut only, with no button on the strip (its tooltip is on the control it opens). */
  hidden?: boolean
}

/** The part Library loads into when it opens from here: the selected one (Right 1 if none). */
function selectedPart(): number {
  const i = app.state.keyboardParts.findIndex((p) => p.selected)
  return i < 0 ? 0 : i
}

/** Stage ↔ Library (docs/racks.md, "Screens"). From the stage it opens on the last tab
 * (Sounds at first), loading into the selected part; `tab` opens that tab instead. */
export function toggleLibrary(tab?: LibraryTab) {
  if (ui.view === 'library' && (!tab || ui.libraryTab === tab)) ui.view = 'stage'
  else ui.openLibrary(tab, ui.view === 'library' ? undefined : selectedPart())
}

/** A display page's Alt key: shows its page tab on the Stage, or goes back to the Stage. */
const page = (id: string) => ({ open: () => stagePage.showing(id), toggle: () => stagePage.toggle(id) })

export const NAV: NavItem[] = [
  { tip: 'nav.library', label: 'Library', key: 'alt+b', open: () => ui.view === 'library', toggle: () => toggleLibrary() },
  { tip: 'nav.styles', label: 'Styles', key: 'alt+s', open: () => ui.browser, toggle: () => (ui.browser = !ui.browser) },
  { tip: 'nav.channel', label: 'Channel', key: 'alt+c', ...page('channel') },
  { tip: 'nav.effects', label: 'Effects', key: 'alt+e', ...page('effects') },
  { tip: 'nav.quick', label: 'Quick Racks', key: 'alt+q', ...page('quickRacks') },
  { tip: 'nav.multipad', label: 'Multi Pads', key: 'alt+p', ...page('multiPads') },
  { tip: 'nav.looper', label: 'Looper', key: 'alt+l', ...page('looper') },
  { tip: 'nav.harmony', label: 'Harmony/Arp', key: 'alt+h', ...page('harmArp') },
  { tip: 'nav.rack', label: 'Rack', key: 'alt+o', open: () => ui.rack, toggle: () => ui.toggleDrawer('rack') },
  // Library's Racks tab (was the Quick Racks drawer's key).
  { tip: 'library.tab_racks', label: 'Library › Racks', key: 'alt+r', open: () => ui.view === 'library' && ui.libraryTab === 'racks', toggle: () => toggleLibrary('racks'), hidden: true },
  // Was the Sound Library drawer; its GM map is Library's Style map tab now.
  { tip: 'library.tab_map', label: 'Style map', key: 'alt+y', open: () => ui.view === 'library' && ui.libraryTab === 'map', toggle: () => toggleLibrary('map'), hidden: true },
  { tip: 'nav.settings', label: 'Settings', key: 'alt+t', open: () => ui.settings, toggle: () => ui.toggleDrawer('settings') },
]
