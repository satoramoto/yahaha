/** One sound in the quick sound list (SoundPickList). */
export interface SoundPickRow {
  /** The catalog id `onpick` gets. */
  id: string
  /** The sound number of a library sound; null: not in My Sounds (drawn "—"). */
  number: number | null
  name: string
  /** Its source, as a plain word. */
  source: 'Mine' | 'Factory' | 'SoundFont'
  favourite: boolean
  /** It plays on the part now: the chosen row. */
  on: boolean
}

/** A group of rows under a hairline header. An empty group isn't drawn. */
export interface SoundPickGroup {
  label: string
  rows: SoundPickRow[]
}
