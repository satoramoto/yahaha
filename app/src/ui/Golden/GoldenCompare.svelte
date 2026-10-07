<!--
  GoldenCompare: the band's knob group and fader group under each tuning, side by side, at the size
  the Stage gives them at the screen size (the screen tokens): the frame is the screen's height
  less the app bar, the keys and their gaps (750 at 900); the band is the frame over phi (463);
  the faders block is the frame across and the band deep (750 × 463), the knobs block the band's
  square over phi² (463 × 177); each is inset fib-13. Each group is a Golden tree (a header band
  over a grid of cells fitted to the control's shape) under a GoldenOverlay, with its report line
  under the block: the cell's size, its spare, what overflows and whether the rows add up.
  A design aid for choosing a tuning.
-->
<script lang="ts">
  import type { Action } from 'svelte/action'
  import type { FaderStrip } from '../FaderBank/types'
  import type { KnobItem } from '../KnobBank/types'
  import FaderCell from './FaderCell.svelte'
  import GoldenBand from './GoldenBand.svelte'
  import GoldenGrid from './GoldenGrid.svelte'
  import GoldenOverlay from './GoldenOverlay.svelte'
  import KnobCell from './KnobCell.svelte'
  import { TUNINGS, type GoldenReport, type Tuning } from './golden'

  type Props = {
    /** The eight band knobs. */
    knobs: KnobItem[]
    /** The nine strips. */
    strips: FaderStrip[]
    /** The tunings to compare, in order; all three by default. */
    tunings?: Tuning[]
    /** The app's `use:tip` action, for the knobs' and faders' tooltips. */
    tipAction?: Action<HTMLElement, string>
    /** What each group's overlay finds under each tuning, each time it changes. */
    onreport?: (tuning: Tuning, group: 'knobs' | 'faders', report: GoldenReport) => void
    /** A knob pressed: its position. */
    onpress?: (index: number) => void
    /** A knob turned: its position and the steps. */
    onstep?: (index: number, delta: number) => void
    /** A fader moved: the strip's id and the level asked for. */
    onlevel?: (id: string, level: number) => void
  }

  let { knobs, strips, tunings = TUNINGS.map((t) => t.id), tipAction, onreport, onpress, onstep, onlevel }: Props = $props()

  let shown = $derived(TUNINGS.filter((t) => tunings.includes(t.id)))
</script>

<div class="compare">
  {#each shown as tuning (tuning.id)}
    <section class="tuning" data-tuning={tuning.id} aria-label="{tuning.title} tuning">
      <h2 class="title">{tuning.title}</h2>
      <div class="blocks">
        <div class="block knobs">
          <GoldenOverlay report reportShape="knob" onreport={(r) => onreport?.(tuning.id, 'knobs', r)}>
            <GoldenBand size="group-header-height" name="Knobs">
              <div class="header"><span>Knobs</span></div>
              <GoldenGrid columns={8} cell="knob" name="Knob grid">
                {#each knobs as knob, i (i)}
                  <KnobCell
                    label={knob.label}
                    code={knob.code}
                    value={knob.value}
                    unit={knob.unit}
                    fraction={knob.fraction}
                    unused={knob.unused}
                    {tipAction}
                    onpress={() => onpress?.(i)}
                    onstep={(delta) => onstep?.(i, delta)}
                  />
                {/each}
              </GoldenGrid>
            </GoldenBand>
          </GoldenOverlay>
        </div>
        <div class="block faders">
          <GoldenOverlay report reportShape="fader" onreport={(r) => onreport?.(tuning.id, 'faders', r)}>
            <GoldenBand size="group-header-height" name="Faders">
              <div class="header"><span>Faders</span></div>
              <GoldenGrid columns={9} cell="fader" name="Fader grid">
                {#each strips as strip (strip.id)}
                  <FaderCell
                    name={strip.faderName}
                    label={strip.tag}
                    value={strip.value}
                    level={strip.level}
                    meter={strip.meter}
                    meter2={strip.meter2}
                    peak={strip.peak}
                    kind={strip.kind}
                    hue={strip.hue}
                    tip={strip.tip}
                    {tipAction}
                    onlevel={(level) => onlevel?.(strip.id, level)}
                  />
                {/each}
              </GoldenGrid>
            </GoldenBand>
          </GoldenOverlay>
        </div>
      </div>
    </section>
  {/each}
</div>

<style>
  .compare {
    /* The Stage's frame and band at the screen size (tokens/stage-frame.css, scale.css, golden.css). */
    --compare-frame: calc(
      var(--screen-height) - 2 * var(--fib-21) - var(--bar-height) - var(--keys-height) - 2 * var(--fib-8)
    );
    --compare-band: calc(var(--compare-frame) / var(--interval-phi));
    display: flex;
    flex-direction: column;
    gap: var(--fib-34);
    box-sizing: border-box;
    padding: var(--fib-21);
    background: var(--g);
    color: var(--t);
  }
  .title {
    margin: 0 0 var(--fib-8);
    color: var(--t);
    font: var(--type-strong);
    letter-spacing: var(--tracking-strong);
  }
  .blocks {
    display: flex;
    align-items: flex-start;
    gap: var(--fib-21);
    /* Room under the blocks for the report lines (they hang below each block). */
    padding-bottom: var(--fib-34);
  }
  .block {
    flex: none;
    box-sizing: border-box;
    padding: var(--fib-13);
    outline: var(--line-width) solid var(--line);
  }
  .knobs {
    width: var(--compare-band);
    height: calc(var(--compare-band) / var(--interval-phi2));
  }
  .faders {
    width: var(--compare-frame);
    height: var(--compare-band);
  }
  .header {
    display: flex;
    align-items: center;
  }
  .header span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--t);
    font: var(--type-strong);
    letter-spacing: var(--tracking-strong);
  }
</style>
