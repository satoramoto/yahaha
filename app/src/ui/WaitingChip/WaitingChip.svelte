<!--
  WaitingChip: names what comes next (the next section, a style waiting for the bar line). Round 2
  draws it as plain light text, quieter than what plays: no outline, no fill; neutral (`t`) is the
  muted grey of Round 2's "Main C", a hue tints it. A readout, not a control: no click, focus or
  tooltip. An empty or whitespace-only label renders nothing.
-->
<script lang="ts">
  type Props = {
    /** The text, drawn as given (a section's shown name or a style's name). Blank: nothing renders. */
    label: string
    /** The text's colour: `t` neutral, drawn in the muted grey (Round 2's next section); a section hue, or `a` for a queued style, tints it. */
    hue?: 'intro' | 'main' | 'ending' | 'brk' | 'fill' | 'a' | 't'
    /** `count` 26 tall, `--type-readout` (count row); `line` 26 tall, `--type-body`, at most 200 wide (style line); `display` 44 tall, `--type-readout-lg` (display). */
    size?: 'count' | 'line' | 'display'
  }

  let { label, hue = 't', size = 'count' }: Props = $props()
</script>

{#if label.trim() !== ''}
  <span
    class="chip {size}"
    style:--hue={hue === 't' ? 'var(--m)' : `var(--${hue})`}
    data-face="waiting"
    data-hue={hue}
    data-size={size}>{label}</span
  >
{/if}

<style>
  .chip {
    display: inline-block;
    box-sizing: border-box;
    flex: none;
    height: var(--chip-height);
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--hue);
    font: var(--type-readout);
    letter-spacing: var(--tracking-readout);
    font-variant-numeric: tabular-nums;
    line-height: var(--chip-height);
    white-space: nowrap;
  }
  .line {
    flex: 0 1 auto;
    min-width: 0;
    max-width: var(--chip-max);
    overflow: hidden;
    text-overflow: ellipsis;
    font: var(--type-body);
    letter-spacing: var(--tracking-body);
    font-variant-numeric: tabular-nums;
    line-height: var(--chip-height);
  }
  .display {
    height: var(--chip-height-display);
    font: var(--type-readout-lg);
    letter-spacing: var(--tracking-readout-lg);
    font-variant-numeric: tabular-nums;
    line-height: var(--chip-height-display);
  }
</style>
