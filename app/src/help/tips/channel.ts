// The Channel page's tooltips (panels/channel/ChannelPage.svelte). tooltips.ts spreads this into
// its catalog last, so a key here joins `TipKey`, and a key that already exists there is replaced.

import type { Tip } from '../tooltips.ts'

export const channelTips = {} satisfies Record<string, Tip>
