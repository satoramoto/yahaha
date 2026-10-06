<!--
  NowPlayingCompact: the Library's compact now-playing block, 320 × 84 at the top of a tall page's
  left column. Line 1: the style name (strong, ellipsis), then the tempo ("104" strong, " BPM" in
  the caption ink) and the run-state dot (solid green with its glow running, a hollow ring
  stopped). Line 2: the chord in the accent at the large size, its notes in the caption ink, and
  the playing section in its section hue. Not a control: no click, no focus.
-->
<script lang="ts">
  import StatusDot from '../StatusDot/StatusDot.svelte'

  type SectionHue = 'intro' | 'main' | 'ending' | 'brk' | 'fill'

  type Props = {
    /** The loaded style's name ("Sunday Drive Pop"); ellipsized when too long. */
    style: string
    /** The tempo in BPM, rounded for display. `null`: "—". */
    tempo: number | null
    /** The band is running: a solid green dot with its glow, named "Running"; else a hollow ring, "Stopped". */
    running?: boolean
    /** The chord's name, root and quality ("Am7"). `null` or empty: "—", no notes. */
    chord: string | null
    /** The chord's note names, space-separated ("A C E G"). */
    notes?: string
    /** The playing section's name ("Main B"); stopped, the one the band will start on. */
    section: string
    /** The section's hue token: the section name is drawn in it. */
    sectionHue?: SectionHue
    /** The block's width in px. */
    width?: number
  }

  let {
    style,
    tempo,
    running = false,
    chord,
    notes = '',
    section,
    sectionHue = 'main',
    width = 320,
  }: Props = $props()

  const DASH = '—'
  /** Before the unit; an expression, so Svelte keeps the space. */
  const UNIT = ' BPM'
  let hasChord = $derived(chord !== null && chord.trim() !== '')
  let shownTempo = $derived(tempo === null ? DASH : String(Math.round(tempo)))
</script>

<div
  class="block"
  role="group"
  aria-label="Now playing"
  data-running={running ? 'true' : 'false'}
  data-hue={sectionHue}
  style:width={`${width}px`}
>
  <div class="line one">
    <span class="style">{style}</span>
    <span class="tempo"><span class="bpm">{shownTempo}</span><span class="unit">{UNIT}</span></span>
    <StatusDot hue="ok" hollow={!running} glow={running} name={running ? 'Running' : 'Stopped'} />
  </div>
  <div class="line two">
    <span class="chord" class:none={!hasChord}>{hasChord ? chord : DASH}</span>
    {#if hasChord && notes}<span class="notes">{notes}</span>{/if}
    <span class="section" style:color={`var(--${sectionHue})`}>{section}</span>
  </div>
</div>

<style>
  .block {
    display: flex;
    flex-direction: column;
    gap: var(--space-12);
    box-sizing: border-box;
    height: 84px;
    min-width: 0;
    font-family: var(--font-sans);
    white-space: nowrap;
  }
  .line {
    display: flex;
    align-items: baseline;
    gap: var(--space-8);
    min-width: 0;
  }
  .one {
    align-items: center;
  }
  .style {
    flex: 0 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--t);
    font: var(--type-strong);
    letter-spacing: var(--tracking-strong);
  }
  .tempo {
    flex: none;
    margin-left: auto;
  }
  .bpm {
    color: var(--t);
    font: var(--type-strong);
    letter-spacing: var(--tracking-strong);
    font-variant-numeric: tabular-nums;
  }
  .unit {
    color: var(--caption-ink);
    font: var(--type-text);
    letter-spacing: var(--tracking-text);
  }
  .two {
    gap: var(--space-12);
  }
  .chord {
    flex: none;
    color: var(--a);
    font: var(--type-large);
    letter-spacing: var(--tracking-large);
  }
  .chord.none {
    color: var(--caption-ink);
  }
  .notes {
    flex: 0 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--caption-ink);
    font: var(--type-text);
    letter-spacing: var(--tracking-text);
  }
  .section {
    flex: none;
    margin-left: auto;
    font: var(--type-strong);
    letter-spacing: var(--tracking-strong);
  }
</style>
