<!--
  OneTouchPicker: One Touch on the style line: "One Touch" and its code "OTS" as a caption, then
  the numbers 1-4 in the one tab style (the same tokens as ChosenTabs, no outlines): each number a
  --type-text label with --tab-pad-side sides, plain --tab-rest at rest; the applied one on a solid
  --neutral block, --tab-block tall and as wide as the tab, centred on the 32px line, in --on-ink.
  The caption is the same size as the numbers (--type-text), in --caption-ink. A click asks for
  that One Touch through `onapply` and changes nothing itself.
-->
<script lang="ts">
  import type { Action } from 'svelte/action'

  type Props = {
    /** The applied One Touch, 1 to `count`; 0 when none is. */
    applied?: number
    /** How many One Touch buttons. */
    count?: number
    /** The words before the numbers. */
    label?: string
    /** The code after the words, the same size and colour as them. */
    code?: string
    /** The group's accessible name. Default: says which is applied and the Launchkey's Shift + pads 9 to 12. */
    name?: string
    /** The app's tooltip action (`use:tip`), applied to each number with its key `ots.<n>`. */
    tipAction?: Action<HTMLElement, string>
    /** Called with 1 to `count` when a number is pressed (applies it at once). */
    onapply?: (n: number) => void
  }

  let {
    applied = 0,
    count = 4,
    label = 'One Touch',
    code = 'OTS',
    name,
    tipAction,
    onapply,
  }: Props = $props()

  const numbers = $derived(Array.from({ length: Math.max(0, count) }, (_, i) => i + 1))
  const spoken = $derived(
    name ??
      `One Touch Setting (OTS): ${applied ? `${applied} applied` : 'none applied'}. ` +
        'Click to apply; on the Launchkey, Shift + pads 9 to 12',
  )

  function tipOn(node: HTMLElement, key: string) {
    if (!tipAction) return
    return tipAction(node, key)
  }
</script>

<div class="ots" role="group" aria-label={spoken}>
  <span class="label" aria-hidden="true">{label}{#if code}<span class="code">{code}</span>{/if}</span>
  {#each numbers as n (n)}
    <button
      type="button"
      class="number"
      class:applied={n === applied}
      aria-pressed={n === applied}
      aria-label={n === applied ? `One Touch ${n}, applied (Shift + pad ${n + 8})` : `Apply One Touch ${n} (Shift + pad ${n + 8})`}
      data-face={n === applied ? 'chosen' : 'off'}
      data-tip="ots.{n}"
      use:tipOn={`ots.${n}`}
      onclick={() => onapply?.(n)}>{n}</button
    >
  {/each}
</div>

<style>
  .ots {
    display: inline-flex;
    align-items: center;
    flex: none;
    height: var(--control-height);
    white-space: nowrap;
  }
  .label {
    display: inline-flex;
    align-items: baseline;
    gap: var(--space-6);
    margin-right: var(--space-4);
    color: var(--caption-ink);
    font: var(--type-text);
    letter-spacing: var(--tracking-text);
  }
  /* The one tab style (ChosenTabs' tokens): a plain label, no outline, no hover look. */
  .number {
    height: var(--control-height);
    margin: 0;
    padding: 0 var(--tab-pad-side);
    border: 0;
    border-radius: var(--radius);
    background: none;
    color: var(--tab-rest);
    font: var(--type-text);
    letter-spacing: var(--tracking-text);
    font-variant-numeric: tabular-nums;
    cursor: pointer;
  }
  /* Applied: the chosen block, --tab-block tall and the tab's width, centred on the line. */
  .number.applied {
    background: linear-gradient(var(--neutral), var(--neutral)) center / 100% var(--tab-block) no-repeat;
    color: var(--on-ink);
  }
  .number:focus-visible {
    outline: var(--line-width) solid var(--focus);
    outline-offset: calc(-1 * var(--line-width));
  }
</style>
