<!--
  TempoReadout: the display's tempo, "104 BPM": the number a large hero value, the unit in text
  beside it on the number's baseline, differing by size, colour and weight. A readout, not a
  control.
-->
<script lang="ts">
  type Props = {
    /** Beats per minute. */
    bpm: number
    /** The unit after the number. */
    unit?: string
  }

  let { bpm, unit = 'BPM' }: Props = $props()
</script>

<span class="tempo" role="img" aria-label="Tempo {bpm} {unit}">
  <span class="bpm" aria-hidden="true">{bpm}</span>
  <span class="unit" aria-hidden="true">{unit}</span>
</span>

<style>
  .tempo {
    display: inline-flex;
    align-items: baseline;
    gap: var(--space-6);
    font-family: var(--font-sans);
    white-space: nowrap;
  }
  /* The number's 40px line sets the row's height. */
  .bpm {
    font: var(--type-large);
    letter-spacing: var(--tracking-large);
    font-variant-numeric: tabular-nums;
    color: var(--t);
  }
  .unit {
    font: var(--type-text);
    letter-spacing: var(--tracking-text);
    color: var(--caption-ink);
  }
</style>
