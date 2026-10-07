// The Harm/Arp page's tooltips (panels/harmony/HarmArpPage.svelte). tooltips.ts spreads this into
// its catalog last, so a key here joins `TipKey`, and a key that already exists there is replaced.

import type { Tip } from '../tooltips.ts'

export const harmArpTips = {
  'harmony.category': {
    title: 'Category',
    body: "Shows this category's Harmony types or arpeggio patterns. The type you have stays until you pick another, so looking around never stops an Echo or an arpeggio.",
    genos: 'Keyboard Harmony / Arpeggio type',
    keys: [],
    launchkey: null,
  },
} satisfies Record<string, Tip>
