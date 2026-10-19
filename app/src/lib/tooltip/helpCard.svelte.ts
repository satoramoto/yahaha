// The help card's props (ui/HelpCard, Stage-Help), from the tooltip state and the catalog:
// the entry help mode shows, where its control is (for the pop-up tip) and the Pop-up tips
// switch (`ui.floatingTips`). Read it in a template or `$derived` so it follows the stores.

import { keyLabel, TIPS, type TipKey } from '../../help/tooltips'
import { ui } from '../store.svelte'
import type { HelpAnchor, HelpEntry } from '../../ui/HelpCard/HelpCard.svelte'
import { tips } from './tip.svelte'

/** A key prefix's group, as the card's header names it; others are the prefix capitalised. */
const GROUPS: Record<string, string> = {
  ots: 'One Touch',
  quick: 'Quick Racks',
  part: 'Keyboard parts',
  fx: 'Effects',
  knobs: 'Knobs',
  multipad: 'Multi Pads',
  padpage: 'Pad pages',
  keystrip: 'Keyboard',
  harmony: 'Harmony / Arp',
  firstrun: 'First run',
  stylemap: 'Style map',
}

export function groupOf(key: string): string {
  const prefix = key.split('.')[0]
  return GROUPS[prefix] ?? prefix.charAt(0).toUpperCase() + prefix.slice(1)
}

/** Catalog entry `key` as the help card draws it, with the control's free text. */
export function helpEntry(key: TipKey, text: string | null = null): HelpEntry {
  const t = TIPS[key]
  return {
    title: t.title,
    body: t.body,
    group: groupOf(key),
    launchkey: t.launchkey ? t.launchkey.split('; ') : [],
    keys: (t.app_keys ?? t.keys).map(keyLabel),
    genos: t.genos && t.genos !== t.title ? t.genos : null,
    text,
  }
}

export interface HelpCardProps {
  entry: HelpEntry | null
  floatingTips: boolean
  anchor: HelpAnchor | null
  onfloatingtips: (on: boolean) => void
}

/** The help card's props now. */
export function helpCard(): HelpCardProps {
  const key = tips.shown
  return {
    entry: key ? helpEntry(key, tips.shownText) : null,
    floatingTips: ui.floatingTips,
    // The pop-up shows only while a control is under the pointer or focus, not for the pin.
    anchor: tips.key ? tips.anchor : null,
    onfloatingtips: (on) => ui.setFloatingTips(on),
  }
}
