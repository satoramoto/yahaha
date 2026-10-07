<!--
  FaderCell: one strip as a Golden tree. A box in the fader's shape (the tuning decides it; a
  fader stands tall) cut in steps from the top: the track (the real Fader, its value moved out,
  filling the step), the value (square in the Phi tuning), then the strip's name. The value and
  the name are one line each, centred, and end in an ellipsis when they don't fit, so the overlay
  reports them.
  The cell fills the slot it is given; inside a grid fitted to a cell shape, the grid fits it. On
  its own (outside any Golden slot) it takes the size the Stage gives one fader cell.
-->
<script lang="ts">
  import type { Action } from 'svelte/action'
  import Fader from '../Fader/Fader.svelte'
  import GoldenBox from './GoldenBox.svelte'
  import GoldenSteps from './GoldenSteps.svelte'

  type Hue = 'r1' | 'r2' | 'r3' | 'l' | 'a' | 't2' | 't'

  type Props = {
    /** The fader's accessible name ("Right 1 · Stage Grand, level 90"). */
    name: string
    /** The strip's name under the fader ("Right 1", "R1 Piano"). */
    label: string
    /** The value step's text: the level ("90") or the layer and its value ("Rev 40"). Empty when parked. */
    value?: string
    /** The set level, 0–127: where the bracket's cap sits. */
    level?: number
    /** The left meter, 0–1 of the travel. */
    meter?: number
    /** The right meter, 0–1 of the travel. */
    meter2?: number
    /** The peak hold line, 0–1 of the travel. */
    peak?: number
    /** `part`, `group`, `master` live; `off` a part switched off; `parked` an unused fader. */
    kind?: 'part' | 'group' | 'master' | 'off' | 'parked'
    /** The strip's colour token (without `--`). */
    hue?: Hue
    /** The non-Vol layer look (Pan, Reverb, Chorus, Delay): meters hidden, bracket and value white. */
    layered?: boolean
    /** The tooltip key, rendered as `data-tip`. */
    tip?: string
    /** The app's `use:tip` action, applied with `tip` when both are set. */
    tipAction?: Action<HTMLElement, string>
    /** Called with the level asked for (0–127, whole). Not when parked. */
    onlevel?: (level: number) => void
    /** Draw the cell's cuts and check them (GoldenOverlay). */
    overlay?: boolean
  }

  let {
    name,
    label,
    value = '',
    level = 0,
    meter = 0,
    meter2 = 0,
    peak = 0,
    kind = 'part',
    hue = 't',
    layered = false,
    tip,
    tipAction,
    onlevel,
    overlay = false,
  }: Props = $props()

  let ink = $derived(layered ? 't' : kind === 'off' ? 'd' : hue)
</script>

<div class="cell">
  <GoldenBox shape="fader" {overlay}>
    <GoldenSteps>
      <div class="track">
        <Fader {name} value="" {level} {meter} {meter2} {peak} {kind} {hue} {layered} {tip} {tipAction} {onlevel} />
      </div>
      <div class="text value" aria-hidden="true">
        <span style:color="var(--{ink})">{kind === 'parked' ? '' : value}</span>
      </div>
      <div class="text name" aria-hidden="true"><span>{label}</span></div>
    </GoldenSteps>
  </GoldenBox>
</div>

<style>
  .cell {
    /* The Stage's faders block (the frame's height across, the band deep, inset fib-13, under its
       header), cut in nine: one fader cell, for a cell on its own. */
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
  /* On its own: the size of one fader cell on the Stage. */
  :global(:not([data-golden-slots])) > .cell {
    width: calc((var(--cell-frame) - 2 * var(--fib-13)) / 9);
    height: calc(var(--cell-band) - 2 * var(--fib-13) - var(--group-header-height));
  }

  /* The track: the Fader filling its step, its value shown in the next step instead. */
  .track {
    container-type: size;
    --fader-height: 100cqh;
    --fader-value-height: 0px;
    --fader-travel-top: 0px;
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
    font: var(--type-strong);
    letter-spacing: var(--tracking-strong);
  }
  .name span {
    color: var(--t2);
    font: var(--type-text);
    letter-spacing: var(--tracking-text);
  }
</style>
