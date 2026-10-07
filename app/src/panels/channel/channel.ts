// The Channel page's small tables (model.ts, nav.svelte.ts). The value texts (pan, tone offsets,
// dB, Hz) are the library's: ui/BarReadout/bar.ts.

import type { InsertType } from '../../lib/api/types'

/** Strips 0–11: the 4 keyboard parts, then the 8 Style parts. */
export const STRIP_COUNT = 12

/** What an insert slot's kind choice offers, in order ('none' empties the slot). */
export const INSERT_KINDS: { kind: InsertType; name: string }[] = [
  { kind: 'none', name: 'None' },
  { kind: 'distortion', name: 'Distortion' },
  { kind: 'compressor', name: 'Compressor' },
  { kind: 'autoWah', name: 'Auto Wah' },
  { kind: 'tremolo', name: 'Tremolo' },
  { kind: 'rotary', name: 'Rotary' },
  { kind: 'phaser', name: 'Phaser' },
]
