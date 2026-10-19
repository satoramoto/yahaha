<!--
  HueValue: one of the Rack's part readouts (KIT §17 in Push terms): the value in the part's hue
  (dim when the part is off), no slider. A slider to assistive tech; it takes a drag, the scroll
  wheel and the arrow keys (Readout's `adjust`), and a double-click resets to `defaultValue`.
-->
<script lang="ts">
  import type { Action } from 'svelte/action'
  import { adjust } from '../Readout/readout'
  import type { PartHue } from './types'

  type Props = {
    value: number
    min?: number
    max?: number
    defaultValue?: number
    /** The value as shown ("C", "L12", "−1"). Default: the number. */
    display?: string
    hue: PartHue
    /** The part is off: dim. Still settable. */
    dim?: boolean
    /** The accessible name ("Right 2 pan"). */
    name: string
    tip?: string
    tipAction?: Action<HTMLElement, string>
    onchange?: (value: number) => void
  }

  let { value, min = 0, max = 127, defaultValue, display, hue, dim = false, name, tip, tipAction, onchange }: Props = $props()

  const shown = $derived(display ?? String(value))

  function tipped(node: HTMLElement, key: string | undefined) {
    if (!tipAction || !key) return
    return tipAction(node, key)
  }
</script>

<span
  class="value"
  role="slider"
  tabindex="0"
  aria-label={name}
  aria-valuemin={min}
  aria-valuemax={max}
  aria-valuenow={value}
  aria-valuetext={shown}
  data-hue={dim ? 'd' : hue}
  data-tip={tip}
  use:tipped={tip}
  use:adjust={{ value, min, max, defaultValue, span: () => 128, onchange }}>{shown}</span
>

<style>
  .value {
    display: inline-flex;
    align-items: center;
    min-width: 0;
    height: 32px;
    font: var(--type-strong);
    letter-spacing: var(--tracking-strong);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    cursor: ew-resize;
    touch-action: none;
    user-select: none;
  }
  [data-hue='r1'] {
    color: var(--r1);
  }
  [data-hue='r2'] {
    color: var(--r2);
  }
  [data-hue='r3'] {
    color: var(--r3);
  }
  [data-hue='l'] {
    color: var(--l);
  }
  [data-hue='d'] {
    color: var(--d);
  }
  .value:focus-visible {
    outline: var(--line-width) solid var(--focus);
    outline-offset: 2px;
  }
</style>
