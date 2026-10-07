// Which bus the Effects page has open: a send (0–5), the Master, or the style's inserts. App-only
// (nothing in the API chooses it), kept while the app runs, send 1 at start. The page shows
// `shownBus` of it (model.ts), so a removed send falls back to send 1.

import type { EffectsBus } from '../../ui/Effects/types'

class EffectsNav {
  bus = $state<EffectsBus>(0)

  open(bus: EffectsBus) {
    this.bus = bus
  }

  reset() {
    this.bus = 0
  }
}

export const effectsNav = new EffectsNav()
