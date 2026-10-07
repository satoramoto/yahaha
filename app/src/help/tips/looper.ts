// The Looper page's tooltips (panels/looper/LooperPage.svelte). tooltips.ts spreads this into its
// catalog last, so a key here joins `TipKey`. Rec / Stop, On / Off, the memories, Memory, Clear,
// New bank, the bank, its name, Save, Overwrite and the sequence keep their keys in tooltips.ts
// (looper.*): an existing key repeated here fails the type check ("specified more than once").

import type { Tip } from '../tooltips.ts'

export const looperTips = {
  'looper.load_bank': {
    title: 'Load bank',
    body: 'Lists the bank files in the ChordLooper folder; pick one to load its eight memories in place of these. The bank in use is the white block. Esc closes the list.',
    genos: 'Chord Looper › Open',
    keys: [],
    launchkey: null,
  },
  'looper.save_as': {
    title: 'Save as…',
    body: 'Saves the eight memories as a bank file under a name you type. Enter saves, Esc cancels; left empty, the bank keeps its own name.',
    genos: 'Chord Looper › Save',
    keys: [],
    launchkey: null,
  },
  'looper.save_cancel': {
    title: 'Cancel',
    body: 'Closes the name field without saving.',
    genos: null,
    keys: [],
    launchkey: null,
  },
} satisfies Record<string, Tip>
