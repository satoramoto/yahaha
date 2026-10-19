// `use:tip={'catalog.key'}` on every interactive element. It marks the element with
// `data-tip` (the coverage test looks for it) and, on hover or keyboard focus, shows the
// catalog entry in the status line above the keys (panels/stage/hint.svelte.ts turns
// `tips.shown` into the line's hint).
//
// Help mode (Stage-Help): the control whose entry is pinned carries the hover mark
// (`data-help-mark`, a 2px outline the help card's styles draw), and `anchor` is where it
// is on screen, for the pop-up tip (`app.floating_tips`) the help card floats next to it.
//
// Free text: an element can also carry `data-tip-text`, data to show with its entry (the
// whole of a value cut off with an ellipsis, say). The tip shows that text as its first line,
// above the entry, so the element still has its catalog key. Whoever changes the text calls
// the action's `update` afterwards, so a tip already showing follows it.

import { keyLabel, isTipKey, type Tip, type TipKey } from '../../help/tooltips'

/** How long the entry stays after the pointer leaves a control, so moving across the gap
 * to the next one doesn't flash the status message back. */
export const CLEAR_MS = 350

/** A control's box on screen, in viewport pixels. */
export interface TipAnchor {
  left: number
  top: number
  right: number
  bottom: number
}

class TipState {
  /** The entry the status line shows: the control hovered or focused. */
  key = $state<TipKey | null>(null)
  /** Help mode: the last entry stays pinned after the pointer leaves. */
  help = $state(false)
  pinned = $state<TipKey | null>(null)
  /** The control with keyboard focus: the screen-reader description (`aria-describedby`)
   * follows it, whatever the pointer is over. */
  focused = $state<TipKey | null>(null)
  /** The hovered or focused element's free text (`data-tip-text`), shown above its entry. */
  text = $state<string | null>(null)
  /** Help mode: the pinned entry's free text. */
  pinnedText = $state<string | null>(null)
  /** Help mode: where the hovered or focused control is on screen (viewport pixels), for
   * the pop-up tip; null when no control is under the pointer or focus. */
  anchor = $state.raw<TipAnchor | null>(null)

  private clearTimer: ReturnType<typeof setTimeout> | null = null
  private owner: HTMLElement | null = null
  /** Help mode: the element whose entry is pinned, so a change to its text reaches the pin. */
  private pinnedOwner: HTMLElement | null = null

  /** What the status line shows: the control under the pointer or focus, else (help mode)
   * the last one. */
  get shown(): TipKey | null {
    return this.key ?? (this.help ? this.pinned : null)
  }

  /** The free text shown with `shown`, if its element has one. */
  get shownText(): string | null {
    return this.key ? this.text : this.help ? this.pinnedText : null
  }

  /** Show `key` for `el` at once, with `el`'s `data-tip-text`. (`_now` is left from the
   * pop-up tips, which waited.) */
  show(el: HTMLElement, key: TipKey, _now?: boolean) {
    this.cancel()
    this.owner = el
    this.key = key
    this.text = el.dataset.tipText || null
    if (this.help) {
      this.pinned = key
      this.pinnedText = this.text
      this.mark(el)
      const r = el.getBoundingClientRect()
      this.anchor = { left: r.left, top: r.top, right: r.right, bottom: r.bottom }
    }
  }

  /** Help mode: `el` (or nothing) carries the hover mark and is the pinned control. */
  private mark(el: HTMLElement | null) {
    if (this.pinnedOwner && this.pinnedOwner !== el) delete this.pinnedOwner.dataset.helpMark
    this.pinnedOwner = el
    if (el) el.dataset.helpMark = ''
  }

  /** `el`'s key or free text changed: where its tip is showing (hovered, leaving, or pinned
   * in help mode), swap in the new key and text in place. It re-shows nothing and leaves a
   * pending clear running, so a tip that is leaving still goes. */
  changed(el: HTMLElement, key: TipKey) {
    const text = el.dataset.tipText || null
    if (this.owner === el && this.key) {
      this.key = key
      this.text = text
    }
    if (this.help && this.pinnedOwner === el) {
      this.pinned = key
      this.pinnedText = text
    }
  }

  /** `el` is gone: stop following it (what's pinned stays as it was). */
  forget(el: HTMLElement) {
    if (this.pinnedOwner === el) this.mark(null)
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
    if (!this.help) {
      this.pinned = null
      this.pinnedText = null
      this.mark(null)
      this.anchor = null
    }
  }

  /** Tests only: forget every hovered, focused and pinned control, so state left by an
   * earlier test file (vitest runs with `isolate: false`) can't leak in. */
  reset() {
    this.clear()
    this.help = false
    this.pinned = null
    this.pinnedText = null
    this.mark(null)
    this.focused = null
  }

  private clear() {
    this.cancel()
    this.key = null
    this.text = null
    this.owner = null
    this.anchor = null
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
      tips.changed(node, k)
    },
    destroy() {
      tips.hide(node)
      tips.forget(node)
      node.removeEventListener('pointerenter', enter)
      node.removeEventListener('pointerleave', leave)
      node.removeEventListener('focus', focus)
      node.removeEventListener('blur', blur)
      node.removeEventListener('mousedown', down)
    },
  }
}
