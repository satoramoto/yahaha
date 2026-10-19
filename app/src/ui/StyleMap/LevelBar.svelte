<!--
  A rule's level as a bar readout (StyleMap board's "Family level"): the caption, a 2px line
  filled to the level with a 2px tick, and the value. Shows, does not set: no command sets a
  rule's level from here. null: no level ("—", an empty line).
-->
<script lang="ts">
  type Props = {
    /** The caption ("Family level"). */
    label: string
    /** 0–127; null: none set. */
    value: number | null
    /** The accessible name's subject ("Ensemble family level"). Default: the label. */
    name?: string
  }

  let { label, value, name }: Props = $props()

  const pct = $derived(value === null ? 0 : Math.max(0, Math.min(100, (value / 127) * 100)))
</script>

<div class="level" role="img" aria-label="{name ?? label}: {value === null ? 'none set' : `${value} of 127`}">
  <span class="caption">{label}</span>
  <span class="line" aria-hidden="true">
    {#if value !== null}
      <span class="fill" style:width="{pct}%"></span>
      <span class="tick" style:left="calc({pct}% - 1px)"></span>
    {/if}
  </span>
  <span class="value">{value ?? '—'}</span>
</div>

<style>
  .level {
    display: flex;
    align-items: center;
    gap: var(--space-12);
    height: 36px;
    white-space: nowrap;
  }
  .caption {
    flex: none;
    width: 88px;
    color: var(--m);
    font: var(--type-text);
  }
  .line {
    position: relative;
    flex: 1;
    height: 2px;
    background: var(--past);
  }
  .fill {
    position: absolute;
    inset: 0 auto 0 0;
    background: var(--t2);
  }
  .tick {
    position: absolute;
    top: -4px;
    width: 2px;
    height: 10px;
    background: var(--t);
  }
  .value {
    flex: none;
    width: 40px;
    color: var(--t);
    font-family: var(--font-sans);
    font-size: 22px;
    font-weight: var(--weight-light);
    line-height: 24px;
    text-align: right;
  }
</style>
