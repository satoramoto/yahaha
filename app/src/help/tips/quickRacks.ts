// The Quick Racks page's tooltips (panels/quickracks/QuickRacksPage.svelte). tooltips.ts spreads
// this into its catalog last, so a key here joins `TipKey`, and a key that already exists there is
// replaced.

import type { Tip } from '../tooltips.ts'

export const quickRacksTips = {} satisfies Record<string, Tip>
