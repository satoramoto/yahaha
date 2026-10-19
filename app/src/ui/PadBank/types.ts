/** One of the sixteen band pads. */
export type PadItem = {
  /** The caption ("Main B"). Tie a numeral to its word with a no-break space (U+00A0), so only whole words wrap. */
  label: string
  /** A section family (the pad's hue), `util` (neutral), `start` (Start / Stop, `--ok` when running),
   * or a part hue (`r1`, `r2`, `r3`, `l`) for a pad the engine lights in that colour. */
  family: 'intro' | 'main' | 'ending' | 'brk' | 'fill' | 'util' | 'start' | 'r1' | 'r2' | 'r3' | 'l'
  /** The face. `lamp`: switched on (the lime lamp face); `chosen`: the chosen one (white block);
   * `unavailable`: can't apply now (the plain face, a dim name). Pad pages 2–5 use these three. */
  state: 'idle' | 'dark' | 'playing' | 'next' | 'armed' | 'running' | 'lamp' | 'chosen' | 'unavailable'
  /** A small tag on the pad ("NEXT", "ARMED", "Save over"); replaces the face's own NEXT / ARMED. */
  tag?: string
  /** The accessible name. Default: "{label} (pad {n})". */
  name?: string
  /** The tooltip key. */
  tip?: string
}

/** One entry of the header's hue legend. */
export type LegendItem = { label: string; hue: string }
