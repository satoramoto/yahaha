<!--
  KnobCell: one band knob as a Golden tree. A box in the knob's shape (the tuning decides it; a
  knob stands tall), a square taken off its top for the dial (the real Knob, drawn as its ring
  alone, filling the square), and the rest cut in steps: the value, then the name. The value and
  the name are one line each, centred, and end in an ellipsis when they don't fit, so the overlay
  reports them ("Retrig rate").
  The cell fills the slot it is given; inside a grid fitted to a cell shape, the grid fits it. On
  its own (outside any Golden slot) it takes the size the Stage gives one knob cell.
-->
<script lang="ts">
  import type { Action } from 'svelte/action'
  import Knob from '../Knob/Knob.svelte'
  import GoldenBox from './GoldenBox.svelte'
  import GoldenSplit from './GoldenSplit.svelte'
  import GoldenSteps from './GoldenSteps.svelte'

  type Props = {
    /** The plain name ("Dynamics", "Retrig rate"). For an unused knob, the board's "---". */
    label: string
    /** The Genos code ("DynCtrl"): spoken, not shown. */
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

  /** Knob's own spoken name: the value is shown in its own step, so the dial carries none. */
  let spoken = $derived(unused ? 'unused' : `${label}${code ? ` (${code})` : ''} ${value}${unit}`)
</script>

<div class="cell">
  <GoldenBox shape="knob" {overlay}>
    <GoldenSplit take="square" from="top">
      <div class="dial">
        <Knob {label} {code} value="" unit="" {fraction} {unused} name={spoken} {tip} {tipAction} {onpress} {onstep} />
      </div>
      <GoldenSteps>
        <div class="text value" class:unused aria-hidden="true">
          <span>{unused ? '' : value}{unused ? '' : unit}</span>
        </div>
        <div class="text name" class:unused aria-hidden="true"><span>{label}</span></div>
      </GoldenSteps>
    </GoldenSplit>
  </GoldenBox>
</div>

<style>
  .cell {
    /* The Stage's knobs block (the band's square over phi², inset fib-13, under its header), cut
       in eight: one knob cell, for a cell on its own. */
    --cell-frame: calc(
      var(--screen-height) - 2 * var(--fib-21) - var(--bar-height) - var(--keys-height) - 2 * var(--fib-8)
    );
    --cell-band: calc(var(--cell-frame) / var(--interval-phi));
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
    width: calc((var(--cell-band) - 2 * var(--fib-13)) / 8);
    height: calc(var(--cell-band) / var(--interval-phi2) - 2 * var(--fib-13) - var(--group-header-height));
  }

  /* The dial: the Knob's ring alone, filling the square; its label and code take no room. */
  .dial {
    display: grid;
    place-items: center;
    container-type: size;
    --knob-height: 100cqh;
    --knob-ring: min(100cqw, 100cqh);
    --knob-ring-gap: 0px;
    --knob-label-height: 0px;
    --knob-value-height: 0px;
    --knob-text-max: 0px;
    --knob-text-overflow: hidden;
  }

  .text {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .text span {
    min-width: 0;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
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
