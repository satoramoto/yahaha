// The Settings pages, and which one is showing. App-only state: it survives leaving and coming
// back to Settings. `?tab=<id>` opens a page (with `?open=settings`, for screenshots).
//
// Two views of one state: the old drawer's ten tabs (`tab`, grouped the way the Genos menus
// group them), and the Settings screen's six pages (`page`, ui/Settings), each holding one or
// more of those tabs (`PAGE_OF_TAB`). Setting a page sets `tab` to its first tab, so
// `?tab=audio` and the Stage's health link (`tab = 'audio'`) land on System.

import type { TipKey } from '../../help/tooltips'
import type { SettingsPageId } from '../../ui/Settings/types'

export type SettingsTab = 'chord' | 'split' | 'transpose' | 'style' | 'pedals' | 'lock' | 'audio' | 'midi' | 'launchkey' | 'library'

export const TABS: { id: SettingsTab; label: string; tip: TipKey; genos: string | null }[] = [
  { id: 'chord', label: 'Chord', tip: 'settings.tab.chord', genos: 'Split & Fingering' },
  { id: 'split', label: 'Split', tip: 'settings.tab.split', genos: 'Split & Fingering' },
  { id: 'transpose', label: 'Transpose', tip: 'settings.tab.transpose', genos: 'Transpose' },
  { id: 'style', label: 'Style', tip: 'settings.tab.style', genos: 'Style Setting' },
  { id: 'pedals', label: 'Pedals', tip: 'settings.tab.controllers', genos: 'Assignable, Controller' },
  { id: 'lock', label: 'Lock', tip: 'settings.tab.lock', genos: 'Utility › Parameter Lock' },
  { id: 'audio', label: 'Audio', tip: 'settings.tab.audio', genos: null },
  { id: 'midi', label: 'MIDI', tip: 'settings.tab.midi', genos: 'MIDI' },
  { id: 'launchkey', label: 'Launchkey', tip: 'settings.tab.launchkey', genos: null },
  { id: 'library', label: 'Library', tip: 'settings.tab.library', genos: null },
]

/** The Settings screen's page each old tab lives on. */
export const PAGE_OF_TAB: Record<SettingsTab, SettingsPageId> = {
  chord: 'chord',
  split: 'chord',
  transpose: 'keyboard',
  lock: 'keyboard',
  style: 'style',
  pedals: 'pedals',
  audio: 'system',
  midi: 'system',
  library: 'system',
  launchkey: 'launchkey',
}

/** A page's first tab (in `TABS` order). */
export function firstTab(page: SettingsPageId): SettingsTab {
  return TABS.find((t) => PAGE_OF_TAB[t.id] === page)?.id ?? 'chord'
}

function fromUrl(): SettingsTab {
  try {
    const t = new URLSearchParams(location.search).get('tab')
    return TABS.find((x) => x.id === t)?.id ?? 'chord'
  } catch {
    return 'chord'
  }
}

class SettingsNav {
  tab = $state<SettingsTab>(fromUrl())

  /** The Settings screen's page: the one holding `tab`. */
  get page(): SettingsPageId {
    return PAGE_OF_TAB[this.tab]
  }

  /** Choosing a page shows its first tab. */
  set page(page: SettingsPageId) {
    this.tab = firstTab(page)
  }
}

export const nav = new SettingsNav()
