/** One row of the Style map's family list: the drums, or a GM family. */
export type FamilyItem = {
  /** -1 for the drums, else the family 0–15. */
  id: number
  /** "Ch 10", "49–56". */
  range: string
  name: string
  /** The rule's sound as shown ("41 Silk Strings"); null: no rule, the family plays auto. */
  rule: string | null
}

/** What decided a program: the From column's word. */
export type MapFrom = 'drums' | 'override' | 'family' | 'auto' | 'none'

/** One program row of the chosen family's table. */
export type ProgramItem = {
  /** 0–127, or -1 for the drum kit row. */
  program: number
  /** The number as shown ("54", "Kit"). */
  num: string
  /** The GM program's name. */
  name: string
  from: MapFrom
  /** The rule that decided it is the style's own. */
  fromStyle?: boolean
  /** The playing sound's library number; null for a SoundFont preset. */
  soundNum: number | null
  /** What plays. */
  sound: string
  /** The level the deciding rule sets (0–127); null shows "—". */
  level: number | null
  /** The style's parts on this program ("Main A, Pad"), if any. */
  used?: string
}
