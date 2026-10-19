<!--
  The chosen family's programs (StyleMap board): No. · GM program · From · Plays · Level, 32px
  rows under a 28px header. The chosen row is the solid block. "From" is a plain word with an
  underline: Override white solid, Family grey solid, Auto grey dashed. Family rows show the
  family level, auto rows "—". The wiring may render the Plays cell itself (`plays`), e.g. as
  the override's sound picker.
-->
<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { Action } from 'svelte/action'
  import type { MapFrom, ProgramItem } from './types'

  type Props = {
    programs: ProgramItem[]
    /** The chosen row's `program`; null: none. */
    chosen: number | null
    /** The accessible name of the list ("Programs 49 to 56"). */
    label: string
    /** The tooltip key of every row's choose button. */
    tip?: string
    tipAction?: Action<HTMLElement, string>
    /** Renders a row's Plays cell. Default: the sound number and name. */
    plays?: Snippet<[ProgramItem]>
    onchoose?: (program: number) => void
  }

  let { programs, chosen, label, tip, tipAction, plays, onchoose }: Props = $props()

  const WORDS: Record<MapFrom, string> = { drums: 'Drums', override: 'Override', family: 'Family', auto: 'Auto', none: 'Unset' }

  function tipOn(node: HTMLElement, key: string | undefined) {
    if (!tipAction || !key) return
    return tipAction(node, key)
  }
</script>

<div class="table">
  <div class="head" aria-hidden="true">
    <span>No.</span><span>GM program</span><span>From</span><span>Plays</span><span class="lvl">Level</span>
  </div>
  <div class="rows" role="list" aria-label={label}>
    {#each programs as p (p.program)}
      {@const on = p.program === chosen}
      <div class="row" class:on role="listitem">
        <button
          type="button"
          class="pick"
          aria-current={on ? 'true' : undefined}
          aria-label="{p.num} {p.name}: {WORDS[p.from].toLowerCase()}{p.fromStyle ? ' (this style)' : ''}, plays {p.soundNum !== null ? `${p.soundNum} ` : ''}{p.sound}{p.level !== null ? `, level ${p.level}` : ''}"
          data-tip={tip}
          use:tipOn={tip}
          onclick={() => onchoose?.(p.program)}
        >
          <span class="num">{p.num}</span>
          <span class="name">{p.name}{#if p.used}<small class="used">{p.used}</small>{/if}</span>
        </button>
        <span class="from-cell"><span class="from {p.from}">{WORDS[p.from]}</span>{#if p.fromStyle}<small class="style">style</small>{/if}</span>
        <span class="plays">
          {#if plays}{@render plays(p)}{:else}
            {#if p.soundNum !== null}<span class="snum">{p.soundNum}</span>{/if}<span class="sound">{p.sound}</span>
          {/if}
        </span>
        <span class="lvl level" class:dim={p.from !== 'override'}>{p.level ?? '—'}</span>
      </div>
    {/each}
  </div>
</div>

<style>
  .table {
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  .head,
  .row {
    display: grid;
    grid-template-columns: 30px minmax(0, 1fr) 70px 170px 36px;
    align-items: center;
    column-gap: var(--space-10);
    box-sizing: border-box;
    padding: 0 var(--space-10);
    white-space: nowrap;
  }
  .head {
    height: 28px;
    color: var(--m);
    font: var(--type-text);
    font-size: 12px;
  }
  .rows {
    min-height: 0;
    overflow-y: auto;
    border-top: var(--line-width) solid var(--line);
  }
  .row {
    height: var(--control-height);
    border-bottom: var(--line-width) solid var(--line);
    color: var(--t);
  }
  .row.on {
    border-bottom-color: var(--t);
    background: var(--t);
    color: var(--g);
  }
  /* The choose button spans the No. and GM program cells. */
  .pick {
    display: grid;
    grid-column: 1 / 3;
    grid-template-columns: 30px minmax(0, 1fr);
    column-gap: var(--space-10);
    align-items: center;
    min-width: 0;
    height: 100%;
    margin: 0;
    padding: 0;
    border: 0;
    background: none;
    color: inherit;
    font: var(--type-text);
    font-size: 14px;
    text-align: left;
    cursor: pointer;
  }
  .num,
  .snum {
    color: var(--m);
    font-family: var(--font-mono);
    font-size: 11px;
  }
  .on .num,
  .on .snum {
    color: var(--g);
    opacity: 0.55;
  }
  .name {
    display: flex;
    align-items: baseline;
    gap: var(--space-6);
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .used {
    color: var(--m);
    font-size: 11px;
  }
  .on .used {
    color: var(--g);
    opacity: 0.55;
  }
  .from {
    border-bottom: var(--line-width) solid var(--m);
    color: var(--m);
    font: var(--type-text);
    font-size: 12px;
    line-height: 15px;
  }
  .from.override {
    border-bottom-color: var(--t);
    color: var(--t);
  }
  .from.auto,
  .from.none {
    border-bottom-style: dashed;
  }
  .on .from {
    border-bottom-color: var(--g);
    color: var(--g);
  }
  .style {
    margin-left: var(--space-4);
    color: var(--m);
    font-size: 10px;
  }
  .plays {
    display: flex;
    align-items: center;
    gap: var(--space-6);
    min-width: 0;
    color: var(--t2);
    font: var(--type-text);
  }
  .on .plays {
    color: var(--g);
  }
  .sound {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .lvl {
    text-align: right;
  }
  .level {
    color: var(--t);
    font-size: 15px;
    font-weight: var(--weight-light);
  }
  .level.dim {
    color: var(--m);
  }
  .on .level {
    color: var(--g);
  }
</style>
