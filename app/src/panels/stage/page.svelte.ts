// The page tab chosen in the Stage's app bar. Only the Stage is built: every other tab shows
// "Coming soon" until its page lands (the old drawers stay reachable from their Alt keys).

class StagePage {
  /** A page tab's id (`model.ts` PAGES): 'stage', 'channel', 'effects', … */
  page = $state('stage')

  /** Esc on another page goes back to the Stage. True when it did. */
  escape(): boolean {
    if (this.page === 'stage') return false
    this.page = 'stage'
    return true
  }
}

export const stagePage = new StagePage()
