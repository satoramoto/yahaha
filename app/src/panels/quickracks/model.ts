// The Quick Racks page (ui/QuickRacks), from app state, and the commands its controls send. Pure,
// so it is unit-tested; QuickRacksPage.svelte only binds these to the store.

import { quickLabel, QUICK_BANKS } from '../../lib/api/quick-racks'
import type { AppCmd, AppState } from '../../lib/api/types'
import type { LinkTiming, OneTouchRow, QuickRackSlot, StoreWait } from '../../ui/QuickRacks/types'

/** The props of ui/QuickRacks that come from state. */
export type QuickRacksView = {
  bank: number
  bankCount: number
  slots: QuickRackSlot[]
  lit: string
  store: boolean
  readOnly: boolean
  waiting: StoreWait | null
  oneTouch: OneTouchRow
}

/** One Touch buttons on the page. */
const OTS_SHOWN = 4

/**
 * The page from state. `rackName` is the name typed for a waiting Store of a never-saved rack;
 * null: the live rack's own name.
 */
export function quickRacksView(state: AppState, rackName: string | null): QuickRacksView {
  const q = state.quickRacks
  const live = state.liveRack
  const slots: QuickRackSlot[] = q.buttons.map((b, i) => ({
    code: quickLabel(q.bank, i),
    name: b.name,
    state: b.rack === null ? 'empty' : b.missing ? 'missing' : b.loaded ? 'loaded' : 'stored',
    modified: b.loaded && live.modified,
    waiting: q.storeWaiting === i,
    tip: `quick.${i + 1}`,
  }))
  const litAt = q.buttons.findIndex((b) => b.loaded)
  const waiting: StoreWait | null =
    q.storeWaiting === null
      ? null
      : {
          code: quickLabel(q.bank, q.storeWaiting),
          rack: live.name,
          needsName: live.id === null,
          name: rackName ?? live.name,
        }
  const ots = state.ots
  return {
    bank: q.bank,
    bankCount: QUICK_BANKS,
    slots,
    lit: litAt < 0 ? '' : quickLabel(q.bank, litAt),
    store: q.store,
    readOnly: q.readOnly,
    waiting,
    oneTouch: {
      items: ots.settings.slice(0, OTS_SHOWN).map((s, i) => {
        const r = ots.racks[i]
        return { name: s.name, rack: r?.rack ?? '', rackName: r?.name ?? '', missing: r?.missing ?? false }
      }),
      applied: ots.applied,
      racks: state.racks.map((r) => ({ id: r.id, name: r.name })),
      link: ots.link,
      timing: ots.linkTiming,
      readOnly: ots.racksReadOnly,
    },
  }
}

/**
 * The commands that show bank `to` (0–7) from bank `from`: Bank −/+ step one bank a press, so a
 * letter further away is that many steps.
 */
export function bankCmds(from: number, to: number): AppCmd[] {
  const delta = Math.sign(to - from)
  return Array.from({ length: Math.abs(to - from) }, () => ({ type: 'stepQuickRackBank', delta }))
}

/** A slot's tap: load its rack (the lit one recalls it; Store armed stores here). */
export const slotCmd = (slot: number): AppCmd => ({ type: 'pressQuickRack', slot })

/** A slot's long press or right-click: save the live rack over it, in one step. */
export const storeCmd = (slot: number): AppCmd => ({ type: 'storeRack', slot })

/** A slot's ✕: empty it (the rack itself stays in your racks). */
export const clearCmd = (state: AppState, slot: number): AppCmd => ({
  type: 'clearQuickRack',
  bank: state.quickRacks.bank,
  slot,
})

/** What an OTS loads for this style: `rack` '' puts the style's own back. */
export const otsRackCmd = (index: number, rack: string): AppCmd =>
  rack === '' ? { type: 'clearOtsRack', index } : { type: 'setOtsRack', index, id: rack }

export const timingCmd = (timing: LinkTiming): AppCmd => ({ type: 'setOtsLinkTiming', timing })

/** The waiting Store's Save rack: over the live rack's own, or as a new one under `name`. */
export function saveCmd(state: AppState, rackName: string | null): AppCmd {
  const live = state.liveRack
  if (live.id !== null) return { type: 'saveRack' }
  const name = (rackName ?? live.name).trim()
  return { type: 'saveRackAs', name: name === '' ? live.name : name }
}
