// The Channel page tab's navigation: the part opener and the chosen group tab.
//
// `show(part)` is the part opener (Channel.md, Parts list): it makes `part` the open part
// (`ui.selectedPart`), a keyboard part also the selected part (`selectPart`), and shows the Channel
// page tab. The parts list and ◀ ▶ use it; a hardware part select (partSelect.svelte.ts) opens
// the page the same way. The Channel page has no close of its own (CH-D4): the Stage tab, its Alt
// key or Esc (stagePage.escape) leave it.
//
// A hardware part select opens Channel from any screen (CH-D15). The spec has App.svelte mount
// that watch; App.svelte isn't this lane's, so this module, which App.svelte already imports,
// starts it once in the app (`startPartSelect`; not under vitest, where tests start it
// themselves). Moving the call into App.svelte is a one-line change for the integrator.

import { app, ui } from '../../lib/store.svelte'
import type { ChannelTab } from '../../ui/Channel/types'
import { stagePage } from '../stage/page.svelte'
import { STRIP_COUNT } from './channel'
import { watchPartSelect } from './partSelect.svelte'

class ChannelNav {
  /** The chosen group tab; kept while the page is away, so it comes back as it was left. */
  tab: ChannelTab = $state('mix')

  /** Open part `part` (0–11, wrapped) on the Channel page. */
  show(part: number) {
    const p = ((Math.trunc(part) % STRIP_COUNT) + STRIP_COUNT) % STRIP_COUNT
    ui.selectedPart = p
    if (p < 4) app.send({ type: 'selectPart', part: p })
    stagePage.show('channel')
  }

  /** Leave the Channel page for the Stage, if it shows; the tab goes back to Mix. */
  close() {
    if (stagePage.page === 'channel') stagePage.page = 'stage'
    this.tab = 'mix'
  }

  /** Esc: the Channel page opens nothing over itself, so stagePage.escape takes Esc. */
  escape(): boolean {
    return false
  }
}

export const channelNav = new ChannelNav()

let stopPartSelect: (() => void) | null = null

/** Start the hardware part select watch, once: a keyboard part newly selected opens Channel on
 * it. Returns the stop. */
export function startPartSelect(): () => void {
  stopPartSelect ??= watchPartSelect((part) => {
    ui.selectedPart = part
    stagePage.show('channel')
  })
  return () => {
    stopPartSelect?.()
    stopPartSelect = null
  }
}

if (typeof window !== 'undefined' && !import.meta.env.VITEST) startPartSelect()
