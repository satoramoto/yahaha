// The Channel page tab's navigation: the part opener and the chosen group tab.
//
// `show(part)` is the part opener (Channel.md, Parts list): it makes `part` the open part
// (`ui.selectedPart`), a keyboard part also the selected part (`selectPart`), and shows the Channel
// page tab. The parts list and ◀ ▶ use it. The Channel page has no close of its own (CH-D4): the
// Stage tab, its Alt key or Esc (stagePage.escape) leave it.
//
// A part becoming selected doesn't open Channel: a sound pick, F1–F4, a rack slot or a rack load
// select parts too, and the state can't yet say a select came from the hardware. Opening it on a
// hardware part select (CH-D15) waits for the contract's `surface.partSelectSeq`.

import { app, ui } from '../../lib/store.svelte'
import type { ChannelTab } from '../../ui/Channel/types'
import { stagePage } from '../stage/page.svelte'
import { STRIP_COUNT } from './channel'

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
