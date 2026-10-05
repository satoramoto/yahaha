<!--
  TempoReadout: the display's tempo, "104 BPM": the number in 32px light text, the unit muted
  beside it on the same baseline. A readout, not a control.
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
  /* The readout's 40px line sets the row's height. */
  .bpm {
    font: var(--type-readout-lg);
    letter-spacing: var(--tracking-readout-lg);
    font-variant-numeric: tabular-nums;
    color: var(--t);
  }
  .unit {
    font: var(--type-body);
    letter-spacing: var(--tracking-body);
    color: var(--caption-ink);
  }
</style>
