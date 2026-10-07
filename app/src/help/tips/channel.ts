// The Channel page's tooltips (panels/channel/ChannelPage.svelte). tooltips.ts spreads this into
// its catalog last, so a key here joins `TipKey`. The keys sit under `mixer.channel.` so
// controls-doc.ts files them in its Mixer group. (A key that already exists there can't be
// replaced from here: the catalog's object literal names it twice and svelte-check rejects that.)

import type { Tip } from '../tooltips.ts'

export const channelTips = {
  'mixer.channel.part': {
    title: 'Part',
    body: 'Opens this part\'s channel on the Channel page. A keyboard part (Right 1–3, Left) also becomes the part you play and edit, as its part button does.',
    genos: 'Mixer › channel',
    keys: [],
    launchkey: 'Shift + fader buttons 1–4 (keyboard parts)',
  },
  'mixer.channel.tab': {
    title: 'Channel group',
    body: 'Shows one group of the part\'s channel: Mix (sound, level, on, solo and sends), EQ & Tone (EQ, the voice\'s tone offsets and how it plays), Compressor, or Inserts.',
    genos: 'Mixer › tabs',
    keys: [],
    launchkey: null,
  },
  'mixer.channel.sound': {
    title: 'Sound',
    body: 'The sound this part plays, with its number in your library. Click to choose another in Library › Sounds, loading into this part.',
    genos: 'Voice select',
    keys: [],
    launchkey: null,
  },
  'mixer.channel.add_send': {
    title: 'Add a send',
    body: 'Adds a send effect (sends 4–6) of the kind you pick: a reverb, a modulation, a delay or the phaser. Every part can then send to it; the rack keeps it, and the Effects page removes it.',
    genos: 'Mixer › Effect › Variation',
    keys: [],
    launchkey: null,
  },
} satisfies Record<string, Tip>
