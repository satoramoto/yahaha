// The Effects page's tooltips (panels/effects/EffectsPage.svelte). tooltips.ts spreads this into
// its catalog last, so a key here joins `TipKey`, and a key that already exists there is replaced.

import type { Tip } from '../tooltips.ts'

export const effectsTips = {
  'fx.send_open': {
    title: 'Send effect',
    body: 'Opens this send\'s settings: its type, parameters, return and each part\'s send. Sends 1–3 are the style\'s reverb, chorus and delay; 4–6 are yours, saved with the rack.',
    genos: 'Mixer › Effect',
    keys: [],
    launchkey: null,
  },
  'fx.send_keep': {
    title: 'Keep with rack',
    body: 'Lit, the live rack keeps this send\'s type over the style\'s and brings it back when loaded. Off, the style sets it again.',
    genos: null,
    keys: [],
    launchkey: null,
  },
  'fx.part_sends': {
    title: 'Part sends',
    body: 'Each keyboard part\'s send to this effect, 0–127: drag sideways, scroll, or use the arrow keys. Knobs 1–4 of the effect\'s knob page and the fader layers set them too.',
    genos: 'Mixer › Effect',
    keys: [],
    launchkey: 'Reverb, Chorus and Delay knob pages, knobs 1–4',
  },
  'fx.inserts_open': {
    title: 'Style inserts',
    body: 'Opens the style\'s insertion effects: each Style part\'s effect, on or off, and its amount.',
    genos: 'Mixer › Effect › Insertion',
    keys: [],
    launchkey: null,
  },
  'fx.master_open': {
    title: 'Master',
    body: 'Opens the Master Compressor and Master EQ, on the whole mix after the effect returns: their types and settings.',
    genos: 'Mixer › Master',
    keys: [],
    launchkey: null,
  },
} satisfies Record<string, Tip>
