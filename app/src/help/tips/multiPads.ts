// The Multi Pads page's tooltips (panels/multipad/MultiPadsPage.svelte). tooltips.ts spreads this
// into its catalog last, so a key here joins `TipKey`, and a key that already exists there is
// replaced.

import type { Tip } from '../tooltips.ts'

export const multiPadsTips = {
  'multipad.bank_prev': {
    title: 'Previous bank',
    body: 'Loads the bank before this one in the list (the last, with none loaded). Pads playing stop.',
    genos: 'Multi Pad Bank Selection',
    keys: [],
    launchkey: null,
  },
  'multipad.bank_next': {
    title: 'Next bank',
    body: 'Loads the bank after this one in the list (the first, with none loaded). Pads playing stop.',
    genos: 'Multi Pad Bank Selection',
    keys: [],
    launchkey: null,
  },
  'multipad.clear_bank': {
    title: 'Clear bank',
    body: 'Unloads the bank: the pads stop and go dark until you load another.',
    genos: null,
    keys: [],
    launchkey: null,
  },
  'multipad.synchro_stop': {
    title: 'Synchro Stop: style stops',
    body: 'On: looping pads stop when the band stops. Off: they play on until you stop them. One-shot pads always play out.',
    genos: 'Multi Pad Synchro Stop (Style Stop)',
    keys: [],
    launchkey: null,
  },
  'multipad.synchro_at_ending': {
    title: 'Synchro Stop: at the ending',
    body: 'On: looping pads stop when an Ending starts. Off: they play through the Ending.',
    genos: 'Multi Pad Synchro Stop (Style Ending)',
    keys: [],
    launchkey: null,
  },
} satisfies Record<string, Tip>
