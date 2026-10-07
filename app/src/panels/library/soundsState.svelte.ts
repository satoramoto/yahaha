// Library › Sounds: the page's own app-only state that libraryNav (nav.svelte.ts) doesn't
// hold: the row moved to, the Save as… form and the delete confirm. The filters (source, ★,
// instrument, category, search) stay in libraryNav; the target part in `ui.libraryPart`.

import type { SoundSaveAs } from '../../ui/LibrarySounds/types'

export class SoundsPageState {
  /** The row moved to (a catalog id); null: follow what the target part plays. */
  selected = $state<string | null>(null)
  /** The Save as… form; null: closed. */
  saveAs = $state<SoundSaveAs | null>(null)
  /** The delete confirm is open for the selected sound. */
  confirmDelete = $state(false)

  reset() {
    this.selected = null
    this.saveAs = null
    this.confirmDelete = false
  }
}

export const soundsPage = new SoundsPageState()
