// `use:tip={'catalog.key'}` on every interactive element. It marks the element with
// `data-tip` (the coverage test looks for it) and, on hover or keyboard focus, shows the
// catalog entry in the status line above the keys (panels/stage/hint.svelte.ts turns
// `tips.shown` into the line's hint). Nothing floats over the instrument.

import { keyLabel, isTipKey, type Tip, type TipKey } from '../../help/tooltips'

/** How long the entry stays after the pointer leaves a control, so moving across the gap
 * to the next one doesn't flash the status message back. */
export const CLEAR_MS = 350

class TipState {
  /** The entry the status line shows: the control hovered or focused. */
  key = $state<TipKey | null>(null)
  /** Help mode: the last entry stays pinned after the pointer leaves. */
  help = $state(false)
  pinned = $state<TipKey | null>(null)
  /** The control with keyboard focus: the screen-reader description (`aria-describedby`)
   * follows it, whatever the pointer is over. */
  focused = $state<TipKey | null>(null)

  private clearTimer: ReturnType<typeof setTimeout> | null = null
  private owner: HTMLElement | null = null

  /** What the status line shows: the control under the pointer or focus, else (help mode)
   * the last one. */
  get shown(): TipKey | null {
    return this.key ?? (this.help ? this.pinned : null)
  }

  /** Show `key` for `el` at once. (`_now` is left from the pop-up tips, which waited.) */
  show(el: HTMLElement, key: TipKey, _now?: boolean) {
    this.cancel()
    this.owner = el
    this.key = key
    if (this.help) this.pinned = key
  }

  /** The pointer left `el` (or it lost focus): clear after `CLEAR_MS`, unless another
   * control takes over first. Without `el`: clear now (Esc). */
  hide(el?: HTMLElement) {
    if (el && this.owner !== el) return
    this.cancel()
    if (!el) {
      this.clear()
      return
    }
    this.clearTimer = setTimeout(() => this.clear(), CLEAR_MS)
  }

  /** A control moved or changed size (a fader cap while dragging). Only the pop-up tips
   * followed it; the status line doesn't move, so this does nothing now. */
  refresh() {}

  toggleHelp() {
    this.help = !this.help
    if (!this.help) this.pinned = null
  }

  /** Tests only: forget every hovered, focused and pinned control, so state left by an
   * earlier test file (vitest runs with `isolate: false`) can't leak in. */
  reset() {
    this.clear()
    this.help = false
    this.pinned = null
    this.focused = null
  }

  private clear() {
    this.cancel()
    this.key = null
    this.owner = null
  }

  private cancel() {
    if (this.clearTimer) clearTimeout(this.clearTimer)
    this.clearTimer = null
  }
}

export const tips = new TipState()

/** The id of the hidden plain-text description of the focused control (`aria-describedby`),
 * rendered once by App.svelte. */
export const TOOLTIP_ID = 'yahaha-help-entry'

/** A catalog entry as plain sentences, for screen readers. */
export function plainTip(t: Tip): string {
  const k = t.app_keys ?? t.keys
  return [
    t.body,
    t.genos && t.genos !== t.title ? `Genos: ${t.genos}.` : '',
    k.length ? `Key: ${k.map(keyLabel).join(' or ')}.` : '',
    t.launchkey ? `Launchkey: ${t.launchkey}.` : '',
  ]
    .filter(Boolean)
    .join(' ')
}

export function tip(node: HTMLElement, key: TipKey) {
  let k = key
  const set = () => {
    if (!isTipKey(k)) console.warn(`tooltip key not in catalog: ${k}`)
    node.dataset.tip = k
  }
  set()
  const enter = (e: PointerEvent) => {
    if (e.pointerType !== 'touch') tips.show(node, k)
  }
  const leave = () => tips.hide(node)
  const focus = () => {
    // Keyboard focus only: a click that focuses shouldn't change what you're reading.
    let visible = true
    try {
      visible = node.matches(':focus-visible')
    } catch {
      /* engines without :focus-visible: treat focus as keyboard focus */
    }
    if (visible) {
      tips.show(node, k)
      tips.focused = k
      node.setAttribute('aria-describedby', TOOLTIP_ID)
    }
  }
  const blur = () => {
    tips.hide(node)
    if (tips.focused === k) tips.focused = null
    node.removeAttribute('aria-describedby')
  }
  // Buttons don't keep focus after a click, so Space and Enter stay performance keys.
  const down = (e: MouseEvent) => {
    if (node instanceof HTMLButtonElement) e.preventDefault()
  }
  node.addEventListener('pointerenter', enter)
  node.addEventListener('pointerleave', leave)
  node.addEventListener('focus', focus)
  node.addEventListener('blur', blur)
  node.addEventListener('mousedown', down)
  return {
    update(next: TipKey) {
      k = next
      set()
    },
    destroy() {
      tips.hide(node)
      node.removeEventListener('pointerenter', enter)
      node.removeEventListener('pointerleave', leave)
      node.removeEventListener('focus', focus)
      node.removeEventListener('blur', blur)
      node.removeEventListener('mousedown', down)
    },
  }
}
