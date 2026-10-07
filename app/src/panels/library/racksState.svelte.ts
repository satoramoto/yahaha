// Library › Racks: the page's app-only state that libraryNav (nav.svelte.ts) doesn't hold:
// the open delete confirm, the Save as… name field, and the duplicate waiting for its copy.

class RacksState {
  /** The rack whose inline delete confirm is open; null: closed. */
  confirming = $state<string | null>(null)
  /** The Save as… name field's text; null: closed. */
  saveAsName = $state<string | null>(null)
  /** After Duplicate: the rack ids there were before, so the copy (the new id) is chosen; null: none waiting. */
  dupBefore = $state<string[] | null>(null)

  reset() {
    this.confirming = null
    this.saveAsName = null
    this.dupBefore = null
  }
}

export const racksState = new RacksState()
