// The Harm/Arp page's data: pure functions from the engine's Harmony/Arpeggio state, the type
// lists and the Rack knob map to the props of the library's `HarmArp` (app/src/ui/HarmArp).
// HarmArpPage.svelte feeds these from the stores; actions.ts turns the page's changes into
// commands. The rules are docs/specs/push/Harmony.md's (Category tabs, Type grid, Settings column).

import type { ControlTarget, HarmonyArpState, HarmonyTypeInfo } from '../../lib/api/types'
import type { HarmArpCategory, HarmArpCategoryTab, HarmArpData, HarmArpItem, HarmArpKind } from '../../ui/HarmArp/types'

/** The two type lists (`app.library`'s), empty until loaded. */
export interface HarmArpLists {
  harmonyTypes: HarmonyTypeInfo[]
  arpPatterns: HarmonyTypeInfo[]
}

const MULTI = 'Multi Assign'
const ECHO = 'Echo'
const HARMONY = 'Harmony'
/** The tab for arpeggio patterns with no category. */
const OTHER = 'Other'

/** The three Harmony tabs, in order. */
const HARMONY_TABS = [HARMONY, ECHO, MULTI]

/** Which settings the selected type has. */
export function kindOf(h: HarmonyArpState): HarmArpKind {
  if (h.mode === 'arpeggio') return 'arpeggio'
  if (h.typeName === MULTI) return 'multi'
  if (h.category === ECHO) return 'echo'
  return 'harmony'
}

/** The category tab the selected type is in. */
export function selectedCategory(h: HarmonyArpState): HarmArpCategory {
  if (h.mode === 'arpeggio') return { group: 'arpeggio', name: h.category || OTHER }
  if (h.typeName === MULTI) return { group: 'harmony', name: MULTI }
  if (h.category === ECHO) return { group: 'harmony', name: ECHO }
  return { group: 'harmony', name: HARMONY }
}

/** The arpeggio categories in list order; patterns without one go last, as "Other". */
export function arpCategories(lists: HarmArpLists): string[] {
  const out: string[] = []
  let other = false
  for (const p of lists.arpPatterns) {
    if (!p.category) other = true
    else if (!out.includes(p.category)) out.push(p.category)
  }
  if (other) out.push(OTHER)
  return out
}

/** Which Harmony tab a Harmony type is on (unknown categories land on Harmony). */
function harmonyTabOf(t: HarmonyTypeInfo): string {
  if (t.name === MULTI) return MULTI
  if (t.category === ECHO) return ECHO
  return HARMONY
}

/** The grid for category `viewed`: its types or patterns, each with its index in its list. */
export function itemsOf(lists: HarmArpLists, viewed: HarmArpCategory): HarmArpItem[] {
  const out: HarmArpItem[] = []
  if (viewed.group === 'harmony') {
    lists.harmonyTypes.forEach((t, index) => {
      if (harmonyTabOf(t) === viewed.name) out.push({ index, name: t.name })
    })
  } else {
    lists.arpPatterns.forEach((p, index) => {
      if ((p.category || OTHER) === viewed.name) out.push({ index, name: p.name })
    })
  }
  return out
}

/** The header's caption after the type's name. */
export function caption(h: HarmonyArpState): string {
  if (h.mode === 'harmony') return h.category === ECHO ? ECHO : ''
  return h.category ? `Arpeggio · ${h.category}` : ''
}

/** The Rack knob (1-8) mapped to the Harmony volume, or null. */
export function volumeKnob(knobs: ControlTarget[]): number | null {
  const i = knobs.findIndex((k) => k.kind === 'harmonyVolume')
  return i < 0 ? null : i + 1
}

/**
 * Everything the page shows. `viewed` is the category tab the player is browsing; null: the
 * selected type's.
 */
export function harmArpData(
  h: HarmonyArpState,
  lists: HarmArpLists,
  knobs: ControlTarget[],
  viewed: HarmArpCategory | null,
): HarmArpData {
  const kind = kindOf(h)
  const sel = selectedCategory(h)
  const holds = (group: HarmArpCategory['group'], name: string) => sel.group === group && sel.name === name
  const harmonyTabs: HarmArpCategoryTab[] = HARMONY_TABS.map((name) => ({
    group: 'harmony',
    name,
    count: itemsOf(lists, { group: 'harmony', name }).length,
    holdsSelected: holds('harmony', name),
  }))
  const arpTabs: HarmArpCategoryTab[] = arpCategories(lists).map((name) => ({
    group: 'arpeggio',
    name,
    count: itemsOf(lists, { group: 'arpeggio', name }).length,
    holdsSelected: holds('arpeggio', name),
  }))

  const want = viewed ?? sel
  // An arpeggio category with no tab: the pattern list isn't there yet, so no grid.
  const shown = want.group === 'arpeggio' && !arpTabs.some((t) => t.name === want.name) ? null : want
  const items = shown ? itemsOf(lists, shown) : []
  const index = h.mode === 'harmony' ? h.harmonyType : h.arpPattern
  const selected = shown && shown.group === sel.group && items.some((i) => i.index === index) ? index : null

  return {
    on: h.on,
    typeName: h.typeName,
    caption: caption(h),
    kind,
    harmonyTabs,
    arpTabs,
    viewed: shown,
    items,
    selected,
    assign: kind === 'arpeggio' && h.assign === 'multi' ? 'auto' : h.assign,
    volume: h.volume,
    volumeKnob: volumeKnob(knobs),
    speed: h.speed,
    chordNoteOnly: h.chordNoteOnly,
    touchLimit: h.touchLimit,
    arp: { ...h.arp },
  }
}
