<!--
  A program map rule's sound (#117), in the Push face (StyleMap board): a button naming the
  rule's sound with its library number and a ▼, that opens the sound picker (`ui.soundPick`) to
  pick any sound, whatever its source: a SoundFont preset or a plugin becomes a library patch
  the first time a rule names it. The clear button ("Set to auto", or ✕ in a table cell) clears
  the rule. Sends nothing itself: `onpick` gets the catalog id, or null to clear.
-->
<script lang="ts">
  import type { TipKey } from '../../help/tooltips'
  import { app, ui } from '../../lib/store.svelte'
  import { tip } from '../../lib/tooltip/tip.svelte'
  import { patchName } from './nav.svelte'

  let {
    value,
    label,
    tipKey,
    none = '—',
    shown,
    cell = false,
    clearText = '✕',
    onpick,
  }: {
    value: string | null
    label: string
    tipKey: TipKey
    /** What the face says with no rule. */
    none?: string
    /** What the face says instead of the rule's name (a table cell shows what plays). */
    shown?: { num: number | null; name: string }
    /** The flat face of a table cell: no fill, inheriting the row's ink. */
    cell?: boolean
    /** The clear button's text. */
    clearText?: string
    onpick: (id: string | null) => void
  } = $props()

  const sl = $derived(app.state.soundLibrary)
  // A patch id, or a catalog id not yet in the library (the new override's pick).
  const patch = $derived(value ? sl.patches.find((p) => p.id === value.replace(/^saved:/, '')) : undefined)
  const name = $derived(value ? (app.sounds.entries.find((e) => e.id === value)?.name ?? patchName(sl, value)) : null)
  const face = $derived(shown ?? { num: patch?.number ?? null, name: name ?? none })
  const open = () => (ui.soundPick = { title: label, value: value?.startsWith('sf:') || value?.startsWith('au:') ? null : (value?.replace(/^saved:/, '') ?? null), onpick: (id) => onpick(id) })
</script>

<span class="pick" class:cell>
  <button type="button" class="val" class:set={!!value} aria-label="{label}: {name ?? none}. Change (opens the Sound picker)" use:tip={tipKey} onclick={open}>
    {#if face.num !== null}<span class="num">{face.num}</span>{/if}<span class="n">{face.name}</span><span class="ar" aria-hidden="true">▼</span>
  </button>
  {#if value}
    <button type="button" class="clr" aria-label="Clear {label}" use:tip={'sound.rule_clear'} onclick={() => onpick(null)}>{clearText}</button>
  {/if}
</span>

<style>
  .pick {
    display: flex;
    align-items: center;
    gap: var(--space-8);
    min-width: 0;
  }
  .val {
    display: flex;
    align-items: center;
    gap: var(--space-8);
    box-sizing: border-box;
    min-width: 0;
    height: var(--control-height-compact);
    margin: 0;
    padding: 0 var(--space-10);
    border: 0;
    border-radius: 4px;
    background: var(--btn);
    color: var(--t2);
    font: var(--type-text);
    font-size: 14px;
    text-align: left;
    white-space: nowrap;
    cursor: pointer;
  }
  .val.set {
    color: var(--t);
  }
  .num {
    flex: none;
    color: var(--m);
    font-family: var(--font-mono);
    font-size: 11px;
  }
  .n {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .ar {
    flex: none;
    color: var(--m);
    font-size: 10px;
  }
  .clr {
    flex: none;
    height: var(--control-height-compact);
    margin: 0;
    padding: 0 2px;
    border: 0;
    background: none;
    color: var(--m);
    font: var(--type-text);
    cursor: pointer;
  }
  /* A table cell: flat, the row's ink, the caret only on hover or focus. */
  .cell {
    width: 100%;
    gap: var(--space-4);
  }
  .cell .val {
    flex: 1;
    height: 100%;
    padding: 0;
    background: none;
    color: inherit;
    font-size: 13px;
  }
  .cell .num,
  .cell .ar,
  .cell .clr {
    color: inherit;
    opacity: 0.6;
  }
  .cell .ar {
    visibility: hidden;
  }
  .cell .val:hover .ar,
  .cell .val:focus-visible .ar {
    visibility: visible;
  }
</style>
