// The Multi Pads page's tooltips (panels/multipad/MultiPadsPage.svelte). tooltips.ts spreads this
// into its catalog last, so a key here joins `TipKey`, and a key that already exists there is
// replaced.

import type { Tip } from '../tooltips.ts'

export const multiPadsTips = {} satisfies Record<string, Tip>
