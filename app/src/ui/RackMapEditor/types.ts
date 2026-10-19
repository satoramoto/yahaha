/** A part's hue, or `t` for a rack-wide target. */
export type MapHue = 't' | 'r1' | 'r2' | 'r3' | 'l'

/** A controller of the map: a Panel fader (1-4) or a Rack knob (1-8). */
export type MapControl = 'fader' | 'knob'

/** One controller's row: its target picker and the target's live value. */
export type MapRow = {
  control: MapControl
  /** 0-based: fader 0-3, knob 0-7. */
  index: number
  /** "Fader 1", "Knob 7". */
  name: string
  /** The target's part tag ("R1"), empty for a rack-wide target. */
  tag: string
  /** The part's hue (the tag and the value), `t` for a rack-wide target. */
  hue: MapHue
  /** The target in words, without the part ("Level", "Rotary fast/slow", "Nothing"). */
  target: string
  /** The target's key (`MapOption.key`): the picker's chosen option. */
  key: string
  /** The target's live value ("90", "C", "Fast"); empty for none. */
  value: string
  /** The target's part is off: the value draws dim. */
  dim?: boolean
  /** Differs from the default map: the 5px dot. */
  changed?: boolean
  /** The accessible name of the picker button. */
  aria: string
}

/** One choice in the picker. */
export type MapOption = {
  key: string
  label: string
  /** The accessible name when the label is short ("Right 2 level"). */
  name?: string
  /** Knobs only (Tempo): dimmed and not choosable on a fader's picker. */
  knobsOnly?: boolean
}

/** A part's targets, behind its tab in the picker. */
export type MapPart = {
  /** "R1". */
  tag: string
  /** "Right 1". */
  name: string
  hue: Exclude<MapHue, 't'>
  /** The part's sound, shown right of the tabs. */
  sound: string
  options: MapOption[]
}
