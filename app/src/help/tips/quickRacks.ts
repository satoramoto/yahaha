// The Quick Racks page's tooltips (panels/quickracks/QuickRacksPage.svelte). tooltips.ts spreads
// this into its catalog last, so a key here joins `TipKey`. (A key that already exists in the
// catalog's literal can't be repeated here: TypeScript rejects the duplicate key.)

import type { Tip } from '../tooltips.ts'

export const quickRacksTips = {
  'quick.library': {
    title: 'Library › Racks',
    body: 'Opens the Library on its Racks page: every rack of yours, to find, rename, duplicate or delete one.',
    genos: null,
    keys: [],
    app_keys: ['alt+r'],
    launchkey: null,
  },
} satisfies Record<string, Tip>
