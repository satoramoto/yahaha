// A hardware part select opens the Channel page on that part (Channel.md CH-D15, CH-C2). Until
// CH-C2 gives the state its own part-select signal, the trigger is a keyboard part's `selected`
// turning on: the first snapshot is the baseline, so starting the app opens nothing.

import { untrack } from 'svelte'
import { app, ui } from '../../lib/store.svelte'

/** Watches the keyboard parts' `selected` flags for a part that became selected. */
export class PartSelectWatch {
  private last: boolean[] | null = null

  /** The part whose `selected` went from false to true since the last call (the first such),
   * else null. The first call only sets the baseline. */
  observe(selected: boolean[]): number | null {
    const prev = this.last
    this.last = selected.slice()
    if (!prev) return null
    const i = selected.findIndex((s, j) => s && prev[j] === false)
    return i < 0 ? null : i
  }

  /** Forget the baseline: the next `observe` sets it again. */
  reset() {
    this.last = null
  }
}

export const partSelect = new PartSelectWatch()

/** Opens the part (`open`) when a hardware part select chooses a part other than the open one.
 * Returns the watch's cleanup. */
export function watchPartSelect(open: (part: number) => void): () => void {
  partSelect.reset()
  return $effect.root(() => {
    $effect(() => {
      const part = partSelect.observe(app.state.keyboardParts.map((p) => p.selected))
      if (part === null) return
      untrack(() => {
        if (part !== ui.selectedPart) open(part)
      })
    })
  })
}
