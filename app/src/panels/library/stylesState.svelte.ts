// Library › Styles: the page's app-only state. The cursor (the highlighted style, by library
// id, so it stays on the same style while the list changes around it) and the filter text.
// Neither goes to the engine; the category, favourites, recents and Preview on select are the
// style browser's remembered prefs (panels/browser/prefs.svelte.ts), shared with it.

export class StylesState {
  /** The highlighted style's library id; null = none (the first row is drawn as the cursor). */
  cursor = $state<number | null>(null)
  /** The filter field's text. */
  query = $state('')
  /** The style id `follow` saw last. */
  private seen: number | null = null

  /** The page opens: the cursor on `loadedId` (the queued style, if one is queued), the filter empty. */
  reset(loadedId: number | null) {
    this.cursor = loadedId
    this.query = ''
    this.seen = loadedId
  }

  /**
   * The loaded (or queued) style changed elsewhere (Track ◀ ▶, a pad, the Launchkey): the cursor
   * follows it. Call it from an effect on `preview.queued ?? style.id`; a repeat of the same id
   * moves nothing, so the cursor stays where the player put it.
   */
  follow(id: number | null) {
    if (id === this.seen) return
    this.seen = id
    if (id !== null) this.cursor = id
  }
}

export const stylesState = new StylesState()
