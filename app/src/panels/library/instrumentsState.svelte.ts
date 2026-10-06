// Library › Instruments' app-only state: the Show tab, the chosen instrument, and the plugin
// whose window opens once its + New sound plays. Survives going back to Stage.

import type { InstrumentShow } from '../../ui/LibraryInstruments/types'

export class InstrumentsState {
  /** The Show tab. */
  show = $state<InstrumentShow>('all')
  /** The chosen row's id (`au:<component>`, `font:<file>`, `missing:<component>`); null: the first row. */
  chosen = $state<string | null>(null)
  /** + New sound: the plugin (component id) whose editor opens once the target part plays it. */
  pendingEditor = $state<string | null>(null)

  reset() {
    this.show = 'all'
    this.chosen = null
    this.pendingEditor = null
  }
}

export const instrumentsState = new InstrumentsState()
