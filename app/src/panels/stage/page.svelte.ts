// The page tab chosen in the Stage's app bar. A display page (Channel, Effects, Quick Racks,
// Multi Pads, Looper, Harm/Arp) shows in the Stage's display box, with the app bar, section row,
// band, status line and keys as on the Stage (StageScreen.svelte, the `page` slot of ui/Stage).

import type { Action } from 'svelte/action'
import { ui } from '../../lib/store.svelte'

/**
 * The props every display page takes (panels/<dir>/<Name>Page.svelte). A page reads the stores
 * (`lib/store.svelte`) itself and sends its commands with `app.send`; these are only what the
 * Stage screen hands down.
 */
export interface PageProps {
  /** The app's tooltip action (`use:tip`): put it on every control, with its catalog key. */
  tipAction: Action<HTMLElement, string>
}

class StagePage {
  /** A page tab's id (`model.ts` PAGES): 'stage', 'channel', 'effects', … */
  page = $state('stage')

  /** Show page tab `id` in the Stage's place, leaving Library or Settings if either shows. */
  show(id: string) {
    ui.view = 'stage'
    ui.settings = false
    this.page = id
  }

  /** Whether page tab `id` is the one showing (not under Library or Settings). */
  showing(id: string): boolean {
    return this.page === id && ui.view === 'stage' && !ui.settings
  }

  /** A page's Alt key: show it, or back to the Stage when it already shows. */
  toggle(id: string) {
    if (this.showing(id)) this.page = 'stage'
    else this.show(id)
  }

  /** Esc on another page goes back to the Stage. True when it did. */
  escape(): boolean {
    if (this.page === 'stage') return false
    this.page = 'stage'
    return true
  }
}

export const stagePage = new StagePage()
