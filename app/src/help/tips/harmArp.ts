// The Harm/Arp page's tooltips (panels/harmony/HarmArpPage.svelte). tooltips.ts spreads this into
// its catalog last, so a key here joins `TipKey`, and a key that already exists there is replaced.

import type { Tip } from '../tooltips.ts'

export const harmArpTips = {} satisfies Record<string, Tip>
