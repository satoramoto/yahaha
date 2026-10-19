<!--
  The Style map's family list (StyleMap board): the drums and the 16 GM families, 32px rows,
  scrolling. The chosen family is the solid block. A filled dot: the family has a rule; hollow:
  auto (the most GM-complete SoundFont).
-->
<script lang="ts">
  import type { Action } from 'svelte/action'
  import type { FamilyItem } from './types'

  type Props = {
    families: FamilyItem[]
    /** The chosen family's `id`. */
    chosen: number
    /** The tooltip key of every row. */
    tip?: string
    tipAction?: Action<HTMLElement, string>
    onchoose?: (id: number) => void
  }

  let { families, chosen, tip, tipAction, onchoose }: Props = $props()

  function tipOn(node: HTMLElement, key: string | undefined) {
    if (!tipAction || !key) return
    return tipAction(node, key)
  }
</script>

<nav class="families" aria-label="GM families">
  {#each families as f (f.id)}
    {@const on = f.id === chosen}
    <button
      type="button"
      class="fam"
      class:on
      aria-current={on ? 'true' : undefined}
      aria-label="{f.name} {f.range}: {f.rule ? `rule ${f.rule}` : 'auto'}"
      data-tip={tip}
      use:tipOn={tip}
      onclick={() => onchoose?.(f.id)}
    >
      <span class="range">{f.range}</span>
      <span class="name">{f.name}</span>
      <span class="dot" class:ruled={!!f.rule} aria-hidden="true"></span>
    </button>
  {/each}
</nav>

<style>
  .families {
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow-y: auto;
    border-top: var(--line-width) solid var(--line);
    scrollbar-width: thin;
  }
  .fam {
    display: flex;
    flex: none;
    align-items: center;
    gap: var(--space-10);
    box-sizing: border-box;
    width: 100%;
    height: var(--control-height);
    margin: 0;
    padding: 0 var(--space-12) 0 var(--space-8);
    border: 0;
    border-bottom: var(--line-width) solid var(--line);
    border-radius: 0;
    background: none;
    color: var(--t2);
    font: var(--type-text);
    font-size: 14px;
    text-align: left;
    white-space: nowrap;
    cursor: pointer;
  }
  .fam.on {
    border-bottom-color: var(--t);
    background: var(--t);
    color: var(--g);
  }
  .range {
    flex: none;
    width: 52px;
    color: var(--m);
    font-family: var(--font-mono);
    font-size: 11px;
  }
  .on .range {
    color: var(--g);
    opacity: 0.55;
  }
  .name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .dot {
    flex: none;
    box-sizing: border-box;
    width: 6px;
    height: 6px;
    border: var(--line-width) solid var(--d);
    border-radius: 50%;
  }
  .dot.ruled {
    border-color: var(--t);
    background: var(--t);
  }
  .on .dot {
    border-color: var(--g);
    opacity: 0.55;
  }
  .on .dot.ruled {
    background: var(--g);
    opacity: 1;
  }
</style>
