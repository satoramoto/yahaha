<!--
  KnobCell: one band knob as a Golden tree that fills the slot it is given (no fit to a shape, so
  no spare). The dial grows to fill its cell: its tree is two label-height bands off the foot (a
  line of text is a fixed token) and the dial in everything they leave:
    GoldenBand label-height, bottom → [name, GoldenBand label-height, bottom → [value, dial]]
  - the dial: the real Knob drawn as its ring alone, as big as the rest allows (its height, or its
    width less a fib-8 gutter, whichever is smaller), centred across, standing on the value;
  - the value, tight under the dial; the name under it.
  One line each: when the full name doesn't fit its cell (measured once the cell has a size), the
  knob's short code ("RtgRate") is shown instead and the full name goes in the title (the tooltip);
  a name never wraps and is never cut short while its code fits.
  Inside a grid fitted to a cell shape, the grid sizes it. On its own (outside any Golden slot) it
  takes the size the Stage gives one knob cell.
-->
<script lang="ts">
  import type { Action } from 'svelte/action'
  import Knob from '../Knob/Knob.svelte'
  import GoldenBand from './GoldenBand.svelte'

  type Props = {
    /** The plain name ("Dynamics", "Retrig rate"). For an unused knob, the board's "---". */
    label: string
    /** The Genos code ("DynCtrl"): spoken, and shown in place of the name when the name doesn't fit. */
    code?: string
    /** The value as shown ("127", "1/8", "Off"). */
    value?: string
    /** A small unit after the value ("%"). */
    unit?: string
    /** How far round the arc is, 0–1 of its 270°. */
    fraction?: number
    /** Nothing is mapped to this knob: dim name, an empty ring, no value. */
    unused?: boolean
    /** The tooltip key, rendered as `data-tip`. */
    tip?: string
    /** The app's `use:tip` action, applied with `tip` when both are set. */
    tipAction?: Action<HTMLElement, string>
    /** Called on a click that didn't turn the knob, Space or Enter. */
    onpress?: () => void
    /** Called with the steps turned (positive: clockwise). Not when unused. */
    onstep?: (delta: number) => void
    /** Draw the cell's cuts and check them (GoldenOverlay). */
    overlay?: boolean
  }

  let {
    label,
    code = '',
    value = '',
    unit = '',
    fraction = 0,
    unused = false,
    tip,
    tipAction,
    onpress,
    onstep,
    overlay = false,
  }: Props = $props()

  /** Knob's own spoken name: the value is shown in its own band, so the dial carries none. */
  let spoken = $derived(unused ? 'unused' : `${label}${code ? ` (${code})` : ''} ${value}${unit}`)

  /** The name's band, and the full name set out of sight on one line, to measure it against the band. */
  let box = $state<HTMLElement>()
  let measure = $state<HTMLElement>()
  /** The full name is wider than its band: show the short code. False where nothing is laid out (jsdom). */
  let short = $state(false)

  $effect(() => {
    const band = box
    const full = measure
    if (!band || !full || typeof ResizeObserver === 'undefined') return
    // Re-measured when the name or code changes (the effect reads them).
    void label
    void code
    const fit = () => {
      short = code !== '' && band.clientWidth > 0 && full.offsetWidth > band.clientWidth
    }
    const observer = new ResizeObserver(fit)
    observer.observe(band)
    fit()
    let live = true
    document.fonts?.ready.then(() => live && fit())
    return () => {
      live = false
      observer.disconnect()
    }
  })
</script>

<div class="cell" lang="en">
  <GoldenBand size="label-height" from="bottom" name="knob" {overlay}>
    <div class="text name" class:unused bind:this={box} title={short ? label : undefined} aria-hidden="true">
      <span>{short ? code : label}</span>
      <span class="probe"><span class="measure" bind:this={measure}>{label}</span></span>
    </div>
    <GoldenBand size="label-height" from="bottom">
      <div class="text value" class:unused aria-hidden="true">
        <span>{unused ? '' : value}{unused ? '' : unit}</span>
      </div>
      <div class="dial">
        <Knob {label} {code} value="" unit="" {fraction} {unused} name={spoken} {tip} {tipAction} {onpress} {onstep} />
      </div>
    </GoldenBand>
  </GoldenBand>
</div>

<style>
  .cell {
    /* The Stage's knobs block (the page frame's minor part across, the band's minor part deep,
       inset fib-13, under its header), cut in eight: one knob cell, for a cell on its own. The
       page frame is the screen less its fib-21 margins; the band is the frame's minor part less
       the keys' phi⁴ step. A cell inside a Golden tree has no inset of its own. */
    --golden-inset: 0px;
    --cell-frame: calc(var(--screen-width) - 2 * var(--fib-21));
    --cell-band: calc(var(--cell-frame) / var(--interval-phi2) * (1 - 1 / var(--interval-phi4)));
    box-sizing: border-box;
    width: 100%;
    height: 100%;
    min-width: 0;
    min-height: 0;
  }
  /* In a grid fitted to a cell shape, the grid sizes the cell (its width and aspect ratio). */
  :global([data-golden-slots][data-cell]) > .cell {
    height: auto;
  }
  /* On its own: the size of one knob cell on the Stage. */
  :global(:not([data-golden-slots])) > .cell {
    width: calc((var(--cell-frame) / var(--interval-phi2) - 2 * var(--fib-13)) / 8);
    height: calc(var(--cell-band) / var(--interval-phi2) - 2 * var(--fib-13) - var(--group-header-height));
  }

  /* The dial: the Knob's ring alone, as big as the rest allows (a fib-8 gutter to its neighbours),
     centred across and standing on the value, so the value sits tight under it; its label and
     code take no room. */
  .dial {
    display: grid;
    place-items: end center;
    container-type: size;
    --knob-ring: max(0px, min(100cqh, 100cqw - var(--fib-8)));
    --knob-height: var(--knob-ring);
    --knob-ring-gap: 0px;
    --knob-label-height: 0px;
    --knob-value-height: 0px;
    --knob-text-max: 0px;
    --knob-text-overflow: hidden;
  }

  .text {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 0;
    overflow: hidden;
    text-align: center;
  }
  .text span {
    min-width: 0;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }
  /* The full name on one line, out of sight and out of the flow, in a box of no size that clips
     it (so the band never reports it as overflow): only measured. */
  .text .probe {
    position: absolute;
    top: 0;
    left: 0;
    width: 0;
    height: 0;
    overflow: hidden;
    visibility: hidden;
  }
  .text .measure {
    display: block;
    width: max-content;
    max-width: none;
    overflow: visible;
  }
  .value span {
    color: var(--a);
    font: var(--type-strong);
    letter-spacing: var(--tracking-strong);
  }
  .name span {
    color: var(--t2);
    font: var(--type-text);
    letter-spacing: var(--tracking-text);
  }
  .name.unused span {
    color: var(--d);
  }
</style>
