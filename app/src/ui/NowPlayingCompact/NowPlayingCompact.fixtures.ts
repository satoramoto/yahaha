import type { ComponentProps } from 'svelte'
import type NowPlayingCompact from './NowPlayingCompact.svelte'

/** The board: Sunday Drive Pop at 104 BPM, running, Am7 (A C E G), Main B playing. */
export const compactBoard = {
  style: 'Sunday Drive Pop',
  tempo: 104,
  running: true,
  chord: 'Am7',
  notes: 'A C E G',
  section: 'Main B',
  sectionHue: 'main',
  width: 320,
} satisfies ComponentProps<typeof NowPlayingCompact>

/** Stopped on Main A, no chord yet. */
export const compactStopped = {
  style: 'Late Night Ballad',
  tempo: 72,
  running: false,
  chord: null,
  notes: '',
  section: 'Main A',
  sectionHue: 'main',
  width: 320,
} satisfies ComponentProps<typeof NowPlayingCompact>
