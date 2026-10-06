<!--
  NowPlayingCompact: the now-playing block at the head of a full page's left column (Settings). Two
  lines: the style, its tempo and the running light; the chord, its notes and the playing section.
  Beat, bar and next live in the section row's count, not here.
-->
<script lang="ts">
  import StatusDot from '../StatusDot/StatusDot.svelte'

  type Props = {
    /** The style's name. */
    style: string
    /** The tempo in BPM. */
    bpm: number
    /** The style is running: the green light. False: a hollow dot. */
    running?: boolean
    /** The chord's name ("Am"); empty: no chord. */
    chord: string
    /** Its extension, drawn after it ("7"). */
    ext?: string
    /** The chord's notes ("A C E G"). */
    notes?: string
    /** The playing section's name ("Main B"). */
    section: string
    /** The section's hue. */
    hue?: 'intro' | 'main' | 'ending' | 'brk' | 'fill'
  }

  let { style, bpm, running = false, chord, ext = '', notes = '', section, hue = 'main' }: Props = $props()
</script>

<div class="block" role="group" aria-label="Now playing">
  <div class="line">
    <span class="style">{style}</span>
    <span class="tempo"><span class="value">{Math.round(bpm)}</span><span class="unit">BPM</span></span>
    <StatusDot hue={running ? 'ok' : 'd'} hollow={!running} name={running ? 'Running' : 'Stopped'} />
  </div>
  <div class="line">
    <span class="chord">{chord || '—'}{#if ext}<span class="ext">{ext}</span>{/if}</span>
    {#if notes}<span class="notes">{notes}</span>{/if}
    <span class="section" data-hue={hue}>{section}</span>
  </div>
</div>

<style>
  .block {
    display: flex;
    flex-direction: column;
    gap: var(--space-8);
    font: var(--type-text);
    letter-spacing: var(--tracking-text);
    font-variant-numeric: tabular-nums;
  }
  .line {
    display: flex;
    align-items: baseline;
    gap: var(--space-12);
    min-width: 0;
    white-space: nowrap;
  }
  .line:first-child {
    align-items: center;
  }
  .style {
    min-width: 0;
    overflow: hidden;
    color: var(--a);
    font: var(--type-strong);
    letter-spacing: var(--tracking-strong);
    text-overflow: ellipsis;
  }
  .tempo {
    display: inline-flex;
    align-items: baseline;
    gap: var(--space-4);
    margin-left: auto;
  }
  .value {
    color: var(--value-ink);
    font: var(--type-strong);
    letter-spacing: var(--tracking-strong);
    font-variant-numeric: tabular-nums;
  }
  .unit,
  .notes {
    color: var(--caption-ink);
  }
  /* One size per line: the chord is the strong text size, set apart by its violet, not by size. */
  .chord {
    color: var(--a);
    font: var(--type-strong);
    letter-spacing: var(--tracking-strong);
  }
  .ext {
    font: var(--type-strong);
    letter-spacing: var(--tracking-strong);
  }
  .section {
    margin-left: auto;
    color: var(--main);
    font: var(--type-strong);
    letter-spacing: var(--tracking-strong);
  }
  .section[data-hue='intro'] {
    color: var(--intro);
  }
  .section[data-hue='ending'] {
    color: var(--ending);
  }
  .section[data-hue='brk'] {
    color: var(--brk);
  }
  .section[data-hue='fill'] {
    color: var(--fill);
  }
</style>
