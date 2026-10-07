<!--
  TempoReadout: the display's tempo block, "104 BPM" with Tempo + and − stacked at its right, so
  the block reads as one compact square. The number is a control (a spinbutton): drag it up or
  down (a step every 4px) or scroll on it to change the tempo, ↑ ↓ step it by 1 BPM (Page Up and
  Page Down by 10), and a double-click goes back to the style's own tempo. + and − report pointer
  down and up through `onplus` / `onminus` for the parent's repeat while held; from the keyboard a
  press calls with `true` then `false`. No boxes: the glyphs and the number brighten on hover and
  show the focus ring on keyboard focus. Holds no tempo and no timers: every change is asked for
  through a callback, and the number shows `bpm` as given.

  `cells` (the golden Stage): it fills its container, which must be a size container
  (`container-type: size`). The number and its unit sit flush left on the container's foot, and
  + over − are outlined neutral squares at its right edge, each half the container's height.
-->
<script lang="ts">
  import type { Action } from 'svelte/action'

  type Props = {
    /** Beats per minute. */
    bpm: number
    /** The unit after the number. */
    unit?: string
    /** The lowest tempo a drag, scroll or key asks for. */
    min?: number
    /** The highest tempo a drag, scroll or key asks for. */
    max?: number
    /** The app's tooltip action (`use:tip`), applied to the number and both glyphs. */
    tipAction?: Action<HTMLElement, string>
    /** Called with the tempo a drag, scroll or key on the number asks for (within `min`–`max`). */
    ontempo?: (bpm: number) => void
    /** Tempo + held (`true`) and released (`false`). */
    onplus?: (down: boolean) => void
    /** Tempo − held and released, as `onplus`. */
    onminus?: (down: boolean) => void
    /** The number double-clicked: back to the style's own tempo. */
    onreset?: () => void
    /** Fill the size container it sits in: the number on its foot, + over − as squares at its right. */
    cells?: boolean
  }

  let {
    bpm,
    unit = 'BPM',
    min = 5,
    max = 500,
    tipAction,
    ontempo,
    onplus,
    onminus,
    onreset,
    cells = false,
  }: Props = $props()

  /** Pixels of drag per BPM. */
  const DRAG_PX = 4

  const clamp = (n: number) => Math.min(max, Math.max(min, Math.round(n)))

  let drag: { id: number; y: number; from: number; last: number } | null = null
  let number: HTMLSpanElement

  function ask(next: number) {
    const v = clamp(next)
    if (v !== Math.round(bpm)) ontempo?.(v)
  }

  function down(e: PointerEvent) {
    if (e.button !== 0) return
    drag = { id: e.pointerId, y: e.clientY, from: bpm, last: bpm }
    number.setPointerCapture?.(e.pointerId)
  }

  function move(e: PointerEvent) {
    if (!drag || e.pointerId !== drag.id) return
    const next = clamp(drag.from + Math.trunc((drag.y - e.clientY) / DRAG_PX))
    if (next === drag.last) return
    drag.last = next
    ontempo?.(next)
  }

  function up(e: PointerEvent) {
    if (!drag || e.pointerId !== drag.id) return
    number.releasePointerCapture?.(e.pointerId)
    drag = null
  }

  function key(e: KeyboardEvent) {
    const step = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1, PageUp: 10, PageDown: -10 }[e.key]
    if (step === undefined) return
    e.preventDefault()
    ask(bpm + step)
  }

  // Scroll: one BPM per wheel step. Not passive, so the page doesn't scroll under it.
  $effect(() => {
    const wheel = (e: WheelEvent) => {
      if (e.deltaY === 0) return
      e.preventDefault()
      ask(bpm + (e.deltaY < 0 ? 1 : -1))
    }
    number.addEventListener('wheel', wheel, { passive: false })
    return () => number.removeEventListener('wheel', wheel)
  })

  /** A glyph's pointer and keyboard presses as a hold. */
  function hold(fn: ((down: boolean) => void) | undefined) {
    let held = false
    return {
      pointerdown: (e: PointerEvent) => {
        if (e.button !== 0) return
        held = true
        fn?.(true)
      },
      release: () => {
        if (!held) return
        held = false
        fn?.(false)
      },
      // A click with no pointer detail is the keyboard's (Enter or Space): one step.
      click: (e: MouseEvent) => {
        if (e.detail !== 0) return
        fn?.(true)
        fn?.(false)
      },
    }
  }

  const plus = hold((d) => onplus?.(d))
  const minus = hold((d) => onminus?.(d))

  function tipOn(node: HTMLElement, key: string) {
    if (!tipAction) return
    return tipAction(node, key)
  }
</script>

<div class="tempo" class:cells data-cells={cells || undefined}>
  <span class="reading">
    <span
      class="bpm"
      bind:this={number}
      role="spinbutton"
      tabindex="0"
      aria-label="Tempo, {unit}. Drag, scroll or use the arrow keys; double-click for the style's tempo"
      aria-valuenow={bpm}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuetext="{bpm} {unit}"
      data-tip="display.tempo"
      use:tipOn={'display.tempo'}
      onpointerdown={down}
      onpointermove={move}
      onpointerup={up}
      onpointercancel={up}
      onkeydown={key}
      ondblclick={() => onreset?.()}>{bpm}</span
    >
    <span class="unit" aria-hidden="true">{unit}</span>
  </span>
  <span class="steps" role="group" aria-label="Tempo">
    <button
      type="button"
      class="step"
      aria-label="Tempo up (Scene Launch)"
      data-tip="tempo.up"
      use:tipOn={'tempo.up'}
      onpointerdown={plus.pointerdown}
      onpointerup={plus.release}
      onpointerleave={plus.release}
      onpointercancel={plus.release}
      onclick={plus.click}><span aria-hidden="true">+</span></button
    >
    <button
      type="button"
      class="step"
      aria-label="Tempo down (Function)"
      data-tip="tempo.down"
      use:tipOn={'tempo.down'}
      onpointerdown={minus.pointerdown}
      onpointerup={minus.release}
      onpointerleave={minus.release}
      onpointercancel={minus.release}
      onclick={minus.click}><span aria-hidden="true">−</span></button
    >
  </span>
</div>

<style>
  .tempo {
    display: inline-flex;
    align-items: stretch;
    gap: var(--space-8);
    font-family: var(--font-sans);
    white-space: nowrap;
  }
  .reading {
    display: inline-flex;
    align-items: baseline;
    gap: var(--space-8);
  }
  .bpm {
    font: var(--type-poster);
    letter-spacing: var(--tracking-poster);
    font-variant-numeric: tabular-nums;
    color: var(--t);
    cursor: ns-resize;
    touch-action: none;
    user-select: none;
  }
  .bpm:hover {
    color: var(--a);
  }
  .bpm:focus-visible,
  .step:focus-visible {
    outline: var(--line-width) solid var(--focus);
    outline-offset: var(--focus-offset);
  }
  .unit {
    font: var(--type-text);
    letter-spacing: var(--tracking-text);
    color: var(--caption-ink);
  }
  /* + over −, together as tall as the number's line (56px): each a 28px square hit area with a
     28px glyph, over twice the small text's 13px. */
  .steps {
    --step-size: calc(var(--tab-block) + var(--space-4));
    display: flex;
    flex-direction: column;
  }
  .step {
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
    min-width: var(--step-size);
    min-height: var(--step-size);
    margin: 0;
    padding: 0;
    border: 0;
    border-radius: var(--radius);
    background: none;
    font-family: var(--font-sans);
    font-size: var(--step-size);
    font-weight: var(--weight-light);
    line-height: 1;
    color: var(--m);
    cursor: pointer;
  }
  .step:hover {
    color: var(--t);
  }

  /* Cells: the whole size container. The reading flush left on the foot: its line boxes trimmed
     to the alphabetic baseline, so the number stands on the bottom edge. */
  .tempo.cells {
    display: flex;
    box-sizing: border-box;
    width: 100%;
    height: 100%;
    gap: 0;
  }
  .cells .reading {
    flex: 1 1 auto;
    align-self: flex-end;
    min-width: 0;
  }
  /* The trimmed-off descent (no ink for digits or capitals) clipped, so it doesn't spill below. */
  .cells .bpm,
  .cells .unit {
    text-box: trim-end cap alphabetic;
    overflow: clip;
  }
  /* + over −, each a square half the container's height, at its right edge. */
  .cells .steps {
    flex: none;
    margin-left: auto;
  }
  .cells .step {
    flex: none;
    width: 50cqh;
    height: 50cqh;
    min-width: 0;
    min-height: 0;
    font: var(--type-text);
    letter-spacing: var(--tracking-text);
    box-shadow: inset 0 0 0 var(--outline-width) var(--neutral);
    color: var(--neutral);
  }
</style>
