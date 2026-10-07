// Quick Racks in the mock (docs/racks.md), as src/session/quick_racks.rs runs them from
// the app: banks A–H of eight buttons naming the user's racks by id, the bank on view,
// Store, a button waiting for the live rack to be saved, and the last store's undo. Kept in
// memory.

import { QUICK_BANKS, QUICK_SLOTS, bankLetter, quickLabel } from './quick-racks'
import type { AppCmd, AppState, QuickRackCmd, QuickRacksState, RackCmd } from './types'

export interface QuickCtx {
  state: AppState
  /** Runs a rack command (the guard included); true when it went through. */
  rack: (c: RackCmd) => boolean
  /** Writes rack `from`'s content over rack `to`'s, keeping `to`'s id and name. */
  copyRack: (from: string, to: string) => void
  message: (text: string, error?: boolean) => void
}

/** What `undoQuickRackStore` takes back: button (`bank`, `slot`) held `before`; `own` is the
 * rack the store saved over and `previous` the id of its "Previous: <name>" copy. */
interface Undo {
  bank: number
  slot: number
  before: string | null
  own: string | null
  previous: string | null
}

const TYPES = new Set<string>([
  'pressQuickRack', 'stepQuickRackBank', 'setQuickRackBank', 'undoQuickRackStore', 'toggleQuickRackStore', 'storeRack', 'clearQuickRack', 'stepQuickRack',
])

const RECOVERED = 'Recovered: '
const PREVIOUS = 'Previous: '

/** `base`, or `base 2`, `base 3`… : the first no rack of `st` is called. */
function uniqueName(st: AppState, base: string): string {
  const taken = (n: string) => st.racks.some((r) => r.name.toLowerCase() === n.toLowerCase())
  let name = base
  for (let n = 2; taken(name); n++) name = `${base} ${n}`
  return name
}

export class MockQuickRacks {
  private banks: (string | null)[][] = Array.from({ length: QUICK_BANKS }, () => Array<string | null>(QUICK_SLOTS).fill(null))
  private bank = 0
  private store = false
  /** A button (bank, slot) waiting for the live rack to be saved. */
  private waiting: [number, number] | null = null
  private undo: Undo | null = null

  handles(cmd: AppCmd): cmd is QuickRackCmd {
    return TYPES.has(cmd.type)
  }

  cmd(cmd: QuickRackCmd, ctx: QuickCtx) {
    switch (cmd.type) {
      case 'pressQuickRack': {
        // Slots 8 and 9 run on into the next bank's 1 and 2.
        const i = this.bank * QUICK_SLOTS + cmd.slot
        if (cmd.slot < 0 || cmd.slot >= 10 || i >= QUICK_BANKS * QUICK_SLOTS) return ctx.message(`no Quick Rack ${cmd.slot + 1}`, true)
        const [bank, slot] = [Math.floor(i / QUICK_SLOTS), i % QUICK_SLOTS]
        if (this.store) return this.storeOn(bank, slot, ctx)
        const live = ctx.state.liveRack
        const id = this.banks[bank][slot]
        if (!cmd.discard && id !== null && id === live.id && ctx.state.racks.some((r) => r.id === id)) return this.recall(id, ctx)
        return this.load(bank, slot, !!cmd.discard, ctx)
      }
      case 'stepQuickRackBank':
        this.bank = Math.max(0, Math.min(QUICK_BANKS - 1, this.bank + Math.sign(cmd.delta)))
        return
      case 'setQuickRackBank':
        if (!Number.isInteger(cmd.bank) || cmd.bank < 0 || cmd.bank >= QUICK_BANKS) return ctx.message(`no Quick Racks bank ${cmd.bank}`, true)
        this.bank = cmd.bank
        return
      case 'undoQuickRackStore':
        return this.takeBack(ctx)
      case 'toggleQuickRackStore':
        this.store = !this.store
        this.waiting = null
        return
      case 'storeRack':
        // One step, no arming (`capture_quick`); Store armed is cleared.
        if (cmd.slot < 0 || cmd.slot >= QUICK_SLOTS) return ctx.message(`no Quick Rack ${cmd.slot + 1}`, true)
        this.store = false
        this.waiting = null
        return this.capture(this.bank, cmd.slot, ctx)
      case 'clearQuickRack':
        if (cmd.bank < 0 || cmd.bank >= QUICK_BANKS || cmd.slot < 0 || cmd.slot >= QUICK_SLOTS) return ctx.message(`no Quick Rack ${cmd.bank}:${cmd.slot}`, true)
        this.banks[cmd.bank][cmd.slot] = null
        this.undo = null
        return
      case 'stepQuickRack': {
        const bank = this.bank
        const stored = [...Array(QUICK_SLOTS).keys()].filter((s) => this.banks[bank][s] !== null)
        const live = ctx.state.liveRack.id
        const lit = live === null ? -1 : stored.findIndex((s) => this.banks[bank][s] === live)
        const d = Math.sign(cmd.delta)
        const to = d === 0 ? undefined : lit < 0 ? (d > 0 ? stored[0] : stored[stored.length - 1]) : stored[lit + d]
        if (to !== undefined) return this.load(bank, to, !!cmd.discard, ctx)
        if (!stored.length) ctx.message(`Bank ${bankLetter(bank)} has no racks`, true)
        return
      }
    }
  }

  /** After a rack command (`quick_after_rack_cmd`): a waiting button takes the saved rack,
   * deleting a rack empties its buttons, loading another rack or dismissing the prompt lets
   * a waiting Store go. */
  afterRack(cmd: RackCmd, ok: boolean, ctx: QuickCtx) {
    const live = ctx.state.liveRack
    if ((cmd.type === 'saveRack' || cmd.type === 'saveRackAs') && ok) {
      if (this.waiting && live.id) this.put(this.waiting[0], this.waiting[1], live.id, null, ctx)
    } else if (cmd.type === 'deleteRack' && ok) {
      for (const b of this.banks) b.forEach((id, s) => id === cmd.id && (b[s] = null))
    } else if ((cmd.type === 'loadRack' || cmd.type === 'newRack' || cmd.type === 'revertRack') && ok) {
      this.waiting = null
    } else if (cmd.type === 'dismissRackPrompt') {
      this.waiting = null
    }
  }

  state(st: AppState): QuickRacksState {
    const live = st.liveRack.id
    const w = this.waiting
    const name = (id: string | null) => (id === null ? undefined : st.racks.find((r) => r.id === id)?.name)
    const u = this.undo
    return {
      bank: this.bank,
      buttons: this.banks[this.bank].map((id) => {
        const found = name(id)
        return { rack: id, name: found ?? '', missing: id !== null && found === undefined, loaded: id !== null && id === live }
      }),
      store: this.store,
      storeWaiting: w && w[0] === this.bank ? w[1] : null,
      readOnly: false,
      undo: u && { bank: u.bank, slot: u.slot, name: name(u.before) ?? '', previous: name(u.previous) ?? null },
    }
  }

  private load(bank: number, slot: number, discard: boolean, ctx: QuickCtx) {
    const label = quickLabel(bank, slot)
    const id = this.banks[bank][slot]
    if (id === null) return ctx.message(`Quick Rack ${label} is empty`, true)
    if (!ctx.state.racks.some((r) => r.id === id)) return ctx.message(`Quick Rack ${label}'s rack is gone`, true)
    this.waiting = null
    ctx.rack({ type: 'loadRack', id, ...(discard ? { discard } : {}) })
  }

  /** The lit button, pressed: its rack recalled clean with no prompt; unsaved changes are
   * kept as "Recovered: <name>", as the hardware does (`switch_rack_unattended`). */
  private recall(id: string, ctx: QuickCtx) {
    this.waiting = null
    const live = ctx.state.liveRack
    if (live.modified && !this.saveLive(uniqueName(ctx.state, `${RECOVERED}${live.name}`), ctx)) return
    ctx.rack({ type: 'loadRack', id, discard: true })
  }

  private storeOn(bank: number, slot: number, ctx: QuickCtx) {
    const live = ctx.state.liveRack
    const saved = live.id !== null && !live.modified && ctx.state.racks.some((r) => r.id === live.id)
    if (saved) return this.put(bank, slot, live.id!, null, ctx)
    this.waiting = [bank, slot]
    ctx.message(`Save the rack first; then it goes on Quick Rack ${quickLabel(bank, slot)}`)
  }

  /** `storeRack`: the live rack, saved as it goes, on button (`bank`, `slot`)
   * (`capture_quick`). The lit button's rack takes the live rack's changes, what it held
   * kept as "Previous: <name>"; elsewhere a saved rack with no changes goes on as it is,
   * and anything else is saved as a new rack named from the sounds of the parts that are
   * on. */
  private capture(bank: number, slot: number, ctx: QuickCtx) {
    const st = ctx.state
    const live = st.liveRack
    const own = live.id !== null && st.racks.some((r) => r.id === live.id) ? live.id : null
    const lit = own !== null && this.banks[bank][slot] === own
    if (own !== null && !live.modified) return this.put(bank, slot, own, null, ctx)
    if (own !== null && lit) {
      const previous = this.keepPrevious(own, ctx)
      if (!this.saveLive(null, ctx)) {
        if (previous !== null) ctx.rack({ type: 'deleteRack', id: previous })
        return
      }
      return this.put(bank, slot, own, { own, previous }, ctx)
    }
    const seen = new Set<string>()
    const names = st.keyboardParts
      .filter((p) => p.on)
      .map((p) => p.voiceName.trim())
      .filter((n) => n && !seen.has(n.toLowerCase()) && seen.add(n.toLowerCase()))
    const name = uniqueName(st, names.length ? names.join(' + ') : 'New rack')
    if (!this.saveLive(name, ctx) || st.liveRack.id === null) return
    this.put(bank, slot, st.liveRack.id, null, ctx)
  }

  /** Rack `own`, as saved, copied to "Previous: <name>" (replacing a rack of that name)
   * before the store saves over it; the copy's id, or null when it couldn't be made. */
  private keepPrevious(own: string, ctx: QuickCtx): string | null {
    const st = ctx.state
    const name = `${PREVIOUS}${st.racks.find((r) => r.id === own)!.name}`
    const old = st.racks.find((r) => r.name.toLowerCase() === name.toLowerCase() && r.id !== own)
    if (old && !ctx.rack({ type: 'deleteRack', id: old.id })) return null
    const had = new Set(st.racks.map((r) => r.id))
    if (!ctx.rack({ type: 'duplicateRack', id: own })) return null
    const copy = ctx.state.racks.find((r) => !had.has(r.id))
    if (!copy) return null
    ctx.rack({ type: 'renameRack', id: copy.id, name })
    return copy.id
  }

  /** `undoQuickRackStore`: the button gets back what it held; a rack saved over gets its
   * "Previous: <name>" copy's content back, the copy goes, and if it is the live rack it
   * reloads as it was, unsaved changes made since the store kept as "Recovered: <name>"
   * (as a recall of the lit button does). */
  private takeBack(ctx: QuickCtx) {
    const u = this.undo
    if (u === null) return ctx.message('Nothing to undo', true)
    this.undo = null
    this.banks[u.bank][u.slot] = u.before
    const st = ctx.state
    if (u.own !== null && u.previous !== null && st.racks.some((r) => r.id === u.previous) && st.racks.some((r) => r.id === u.own)) {
      ctx.copyRack(u.previous, u.own)
      ctx.rack({ type: 'deleteRack', id: u.previous })
      if (st.liveRack.id === u.own) this.recall(u.own, ctx)
    }
    ctx.message(`Undid the store on Quick Rack ${quickLabel(u.bank, u.slot)}`)
  }

  /** Save the live rack (`saveRack`, or `saveRackAs` with a name) with no dialog: edited
   * sounds take their suggested names and a prompt up is dismissed (`save_live`). */
  private saveLive(saveAs: string | null, ctx: QuickCtx): boolean {
    const st = ctx.state
    st.liveRack.prompt = null
    const soundNames: Record<number, string> = {}
    st.keyboardParts.forEach((p, part) => {
      if (p.soundEdited) soundNames[part] = p.sound?.name ?? p.voiceName
    })
    return ctx.rack(saveAs === null ? { type: 'saveRack', soundNames } : { type: 'saveRackAs', name: saveAs, soundNames })
  }

  /** Rack `id` on button (`bank`, `slot`). A store that changes the button or saved over a
   * rack (`saved`) becomes the one to undo. */
  private put(bank: number, slot: number, id: string, saved: { own: string; previous: string | null } | null, ctx: QuickCtx) {
    this.store = false
    this.waiting = null
    const before = this.banks[bank][slot]
    if (before !== id || saved) this.undo = { bank, slot, before, own: saved?.own ?? null, previous: saved?.previous ?? null }
    this.banks[bank][slot] = id
    ctx.message(`Stored ${ctx.state.liveRack.name} on Quick Rack ${quickLabel(bank, slot)}`)
  }
}
