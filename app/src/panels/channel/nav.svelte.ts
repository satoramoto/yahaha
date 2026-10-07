// The Channel page tab's navigation: the part opener and the chosen group tab.
//
// `show(part)` is the part opener (Channel.md, Parts list): it makes `part` the open part
// (`ui.selectedPart`), a keyboard part also the selected part (`selectPart`), and shows the Channel
// page tab. The parts list and ◀ ▶ use it. The Channel page has no close of its own (CH-D4): the
// Stage tab, its Alt key or Esc (stagePage.escape) leave it.
//
// A part select on the Launchkey (Shift + fader button 1–4) opens the Channel page on that part
// (CH-D15), whatever page shows: the watcher below reacts to `surface.partSelectSeq` moving, which
// counts only those. A part becoming selected otherwise (`selectPart` from the app, F1–F4, a sound
// pick, a rack slot or a rack load) doesn't open it, and the watcher sends no `selectPart` of its
// own (the hardware already selected the part). A session's first state is a baseline, also after
// attaching another session, whose counter has nothing to do with the last one's; so is a counter
// that goes down (the engine restarted under the same session).

import { untrack } from 'svelte'
import type { AppState } from '../../lib/api/types'
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

/** A Launchkey part select: the Channel page on the selected keyboard part. */
function openSelected(s: AppState) {
  const part = s.keyboardParts.findIndex((p) => p.selected)
  if (part < 0) return
  ui.selectedPart = part
  stagePage.show('channel')
}

/** Where the running watcher keeps its stop, across module reloads (HMR re-runs this module,
 * whose own variables start fresh). */
const WATCHER = Symbol.for('yahaha.channelNav.partSelectWatcher')
type Global = { [WATCHER]?: () => void }

/** Start the part-select watcher (this module starts it on load). Idempotent: a second call,
 * as a module reload makes, stops the first watcher and replaces its `app.attach` note rather
 * than wrapping it again. Returns the stop. */
export function watchPartSelects(): () => void {
  const g = globalThis as Global
  g[WATCHER]?.()

  /** The state shown when a session was attached (the empty state, or the last session's):
   * not the attached session's, so never its baseline. */
  let before: AppState = app.state
  /** The attached session's `partSelectSeq` last seen; null until its first state. */
  let seen: number | null = null

  // The store has no attach hook, so note each attach here: its first state is a new baseline.
  // It always wraps the store's own `attach` (its class's), never an earlier note, so it can't
  // stack; the class's method is looked up per call.
  const store = Object.getPrototypeOf(app) as typeof app
  app.attach = (session) => {
    before = app.state
    seen = null
    store.attach.call(app, session)
  }

  const stopEffect = $effect.root(() => {
    $effect(() => {
      const s = app.state
      if (s === before) return
      // An engine before the counter has none: nothing opens.
      const seq = s.surface.partSelectSeq ?? null
      // Only a counter that goes up is a select; one that goes down is an engine that
      // restarted under the same session, so it's a new baseline.
      const moved = seen !== null && seq !== null && seq > seen
      seen = seq
      if (moved) untrack(() => openSelected(s))
    })
  })

  const stop = () => {
    stopEffect()
    if (Object.hasOwn(app, 'attach')) delete (app as { attach?: unknown }).attach
    if (g[WATCHER] === stop) delete g[WATCHER]
  }
  g[WATCHER] = stop
  return stop
}

watchPartSelects()
