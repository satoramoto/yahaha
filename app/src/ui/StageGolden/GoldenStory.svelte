<!--
  GoldenStory: a story-only wrapper for the Screens/Stage › Golden stories. It renders the Stage
  with `layout="golden"` (or, with `playground`, the Stage Playground wrapper in that layout) and,
  with `showGrid`, draws the golden frame's cut lines, each block's inner padding, the beat bar's
  line and the golden spiral over it, so each block can be seen sitting on its line. Nothing here
  is in the app: the overlay is a design aid.

  The geometry below mirrors tokens/stage-golden.css (SVG coordinates need numbers).
-->
<script lang="ts">
  import type { ComponentProps } from 'svelte'
  import Stage from '../Stage/Stage.svelte'
  import StagePlayground from '../Stage/StagePlayground.svelte'

  type Props = ComponentProps<typeof Stage> & {
    /** Draws the cuts, the paddings, the beat bar's line and the golden spiral over the screen. */
    showGrid?: boolean
    /** Renders the interactive Playground wrapper instead of the plain Stage. */
    playground?: boolean
  }

  let { showGrid = false, playground = false, ...stage }: Props = $props()

  // tokens/stage-golden.css, in px on the 1440 × 900 artboard.
  const LEFT = 111
  const WIDTH = 1217
  const FRAME_TOP = 64
  const FRAME_HEIGHT = 752
  const DISPLAY = 287
  const NARROW = 178
  const FADERS = 752
  const SIDE = 465
  const KNOBS = 178
  const PAD = 13
  const BAR = { x: LEFT, y: 20, w: WIDTH, h: 36 }
  const KEYS = { x: LEFT, y: 824, w: WIDTH, h: 56 }

  type Rect = { x: number; y: number; w: number; h: number }
  const BAND_TOP = FRAME_TOP + DISPLAY

  /** Every block's rectangle: the cut lines. */
  const BLOCKS: Rect[] = [
    { x: LEFT, y: FRAME_TOP, w: DISPLAY, h: DISPLAY },
    { x: LEFT + DISPLAY, y: FRAME_TOP, w: DISPLAY, h: DISPLAY },
    { x: LEFT + 2 * DISPLAY, y: FRAME_TOP, w: NARROW, h: DISPLAY },
    { x: LEFT + 2 * DISPLAY + NARROW, y: FRAME_TOP, w: NARROW, h: DISPLAY },
    { x: LEFT + 2 * DISPLAY + 2 * NARROW, y: FRAME_TOP, w: DISPLAY, h: DISPLAY },
    { x: LEFT, y: BAND_TOP, w: FADERS, h: SIDE },
    { x: LEFT + FADERS, y: BAND_TOP, w: SIDE, h: KNOBS },
    { x: LEFT + FADERS, y: BAND_TOP + KNOBS, w: SIDE, h: SIDE - KNOBS },
  ]
  const BEAT_Y = FRAME_TOP + 0.75 * DISPLAY

  /**
   * The golden spiral: squares cut off the frame in turn (left, bottom, right, top, …), a quarter
   * arc in each, from the corner where the last arc ended to the opposite corner.
   */
  function spiral(): string {
    let r: Rect = { x: LEFT, y: FRAME_TOP, w: WIDTH, h: FRAME_HEIGHT }
    let d = `M ${r.x} ${r.y}`
    for (let i = 0; i < 12; i++) {
      const side = i % 4
      const s = side % 2 === 0 ? r.h : r.w
      if (s < 1) break
      if (side === 0) {
        d += ` A ${s} ${s} 0 0 0 ${r.x + s} ${r.y + s}`
        r = { x: r.x + s, y: r.y, w: r.w - s, h: r.h }
      } else if (side === 1) {
        d += ` A ${s} ${s} 0 0 0 ${r.x + s} ${r.y + r.h - s}`
        r = { x: r.x, y: r.y, w: r.w, h: r.h - s }
      } else if (side === 2) {
        d += ` A ${s} ${s} 0 0 0 ${r.x + r.w - s} ${r.y}`
        r = { x: r.x, y: r.y, w: r.w - s, h: r.h }
      } else {
        d += ` A ${s} ${s} 0 0 0 ${r.x} ${r.y + s}`
        r = { x: r.x, y: r.y + s, w: r.w, h: r.h - s }
      }
    }
    return d
  }
  const SPIRAL = spiral()
</script>

<div class="frame">
  {#if playground}
    <StagePlayground {...stage} layout="golden" />
  {:else}
    <Stage {...stage} layout="golden" />
  {/if}
  {#if showGrid}
    <svg class="overlay" viewBox="0 0 1440 900" aria-hidden="true">
      {#each [...BLOCKS, BAR, KEYS] as b, i (i)}
        <rect class="inset" x={b.x + PAD} y={b.y + PAD} width={b.w - 2 * PAD} height={b.h - 2 * PAD} />
        <rect class="cut" x={b.x} y={b.y} width={b.w} height={b.h} />
      {/each}
      <rect class="frame-line" x={LEFT} y={FRAME_TOP} width={WIDTH} height={FRAME_HEIGHT} />
      <line class="beat" x1={LEFT} y1={BEAT_Y} x2={LEFT + WIDTH} y2={BEAT_Y} />
      <path class="spiral" d={SPIRAL} />
    </svg>
  {/if}
</div>

<style>
  .frame {
    position: relative;
    width: var(--screen-width);
    height: var(--screen-height);
  }
  .overlay {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }
  .overlay * {
    fill: none;
    vector-effect: non-scaling-stroke;
  }
  .cut,
  .frame-line {
    stroke: var(--golden-overlay-cut);
    stroke-width: var(--line-width);
  }
  .frame-line {
    stroke-width: var(--header-rule-width);
  }
  .inset {
    stroke: var(--golden-overlay-pad);
    stroke-width: var(--line-width);
    stroke-dasharray: 4 4;
  }
  .beat {
    stroke: var(--golden-overlay-cut);
    stroke-width: var(--line-width);
    stroke-dasharray: 2 6;
  }
  .spiral {
    stroke: var(--golden-overlay-spiral);
    stroke-width: var(--header-rule-width);
  }
</style>
