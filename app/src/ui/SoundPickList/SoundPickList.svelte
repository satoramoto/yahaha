<!--
  SoundPickList: a keyboard part's quick sound list (the SoundPick board). A black panel with a 1px
  light edge: "Plays on" with the part's short name on its hue and its full name, a Close button,
  an underline search field, then the groups (hairline headers, "Last used", "Favourites", …), each
  row 32 tall and hairline-separated: the sound number (or "—" for a sound not in My Sounds), the
  name, the source as a plain word (Mine in the accent, Factory and SoundFont muted) and a star for
  a favourite. The row playing on the part now is the chosen row: a solid white block with black
  text and "on R1". A footer: "More in Library →" and a caption. ↑/↓ step between the rows (↓ from
  the search field reaches the first). Controlled: it holds no state; where it sits is the
  parent's: it draws in place.
-->
<script lang="ts">
  import type { Action } from 'svelte/action'
  import SearchField from '../SearchField/SearchField.svelte'
  import type { SoundPickGroup, SoundPickRow } from './types'

  type Props = {
    /** The panel's id: the opener's `aria-controls` names it. */
    id?: string
    /** The part's short name ("R1"). */
    part: string
    /** The part's full name ("Right 1"). */
    partName: string
    /** The part's hue. */
    hue?: 'r1' | 'r2' | 'r3' | 'l'
    groups: SoundPickGroup[]
    /** The search field's text; the parent owns it. */
    query?: string
    /** Shown when every group is empty. */
    empty?: string
    /** Tooltip keys: a row, the search field, More in Library, Close. */
    rowTip?: string
    searchTip?: string
    moreTip?: string
    closeTip?: string
    /** The app's tooltip action (`use:tip`). */
    tipAction?: Action<HTMLElement, string>
    oninput?: (query: string) => void
    /** A row was pressed. */
    onpick?: (id: string) => void
    /** More in Library was pressed. */
    onmore?: () => void
    /** Close was pressed. */
    onclose?: () => void
  }

  let {
    id = 'quick-sounds',
    part,
    partName,
    hue = 'r1',
    groups,
    query = '',
    empty = 'No sounds here yet.',
    rowTip,
    searchTip,
    moreTip,
    closeTip,
    tipAction,
    oninput,
    onpick,
    onmore,
    onclose,
  }: Props = $props()

  let box: HTMLDivElement | undefined = $state()
  const shown = $derived(groups.filter((g) => g.rows.length > 0))

  function tipOn(node: HTMLElement, key: string | undefined) {
    if (!tipAction || !key) return
    return tipAction(node, key)
  }

  const options = () => [...(box?.querySelectorAll<HTMLElement>('[role="option"]') ?? [])]

  /** ↑/↓ step through every row across the groups; ↓ from the search field reaches the first. */
  function step(event: KeyboardEvent) {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    const all = options()
    if (!all.length) return
    event.preventDefault()
    const at = all.indexOf(document.activeElement as HTMLElement)
    const next = at < 0 ? (event.key === 'ArrowDown' ? 0 : all.length - 1) : Math.max(0, Math.min(all.length - 1, at + (event.key === 'ArrowDown' ? 1 : -1)))
    all[next].focus()
  }

  /** Every key but Esc stays in the list, so the window's shortcuts don't act on typing. */
  function own(event: KeyboardEvent) {
    step(event)
    if (event.key !== 'Escape') event.stopPropagation()
  }

  const aria = (r: SoundPickRow) =>
    `${r.number !== null ? `${r.number} ` : ''}${r.name}, ${r.source}${r.favourite ? ', favourite' : ''}${r.on ? `, playing on ${partName}` : `. Click to play it on ${partName}`}`
</script>

<div class="panel" {id} role="dialog" tabindex="-1" aria-label="Quick sounds for {partName}" bind:this={box} onkeydown={own}>
  <div class="head">
    <span class="muted">Plays on</span>
    <span class="tag" data-hue={hue}>{part}</span>
    <span>{partName}</span>
    <button type="button" class="btn close" aria-label="Close (Esc)" data-tip={closeTip} use:tipOn={closeTip} onclick={() => onclose?.()}>Close</button>
  </div>
  <div class="search">
    <SearchField value={query} label="Search sounds" placeholder="Search sounds or type a number" tip={searchTip} {tipAction} {oninput} />
  </div>

  <div class="scroll">
    {#each shown as g (g.label)}
      <div class="group">{g.label}</div>
      <div role="listbox" aria-label="{g.label} sounds">
        {#each g.rows as r (r.id)}
          <button type="button" class="row" class:on={r.on} role="option" aria-selected={r.on} aria-label={aria(r)} data-tip={rowTip} use:tipOn={rowTip} onclick={() => onpick?.(r.id)}>
            <span class="num" class:none={r.number === null}>{r.number ?? '—'}</span>
            <span class="name"><span class="text">{r.name}</span>{#if r.on}<span class="now">on {part}</span>{/if}</span>
            <span class="src" class:mine={r.source === 'Mine'}>{r.source}</span>
            <svg class="star" class:fav={r.favourite} viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
              <path d="M8 1.5l1.9 4 4.3.5-3.2 3 .9 4.3L8 11.1l-3.9 2.2.9-4.3-3.2-3 4.3-.5z" />
            </svg>
          </button>
        {/each}
      </div>
    {:else}
      <p class="empty">{empty}</p>
    {/each}
  </div>

  <div class="foot">
    <button type="button" class="btn more" data-tip={moreTip} use:tipOn={moreTip} onclick={() => onmore?.()}>More in Library →</button>
    <span class="hint">Click plays it now · Esc closes</span>
  </div>
</div>

<style>
  .panel {
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    width: 380px;
    /* Shrinks to the parent's height (a column flex box with a max-height); the groups scroll. */
    min-height: 0;
    max-height: 100%;
    padding: var(--space-8) 0;
    background: var(--g);
    box-shadow: inset 0 0 0 var(--outline-width) var(--m);
    color: var(--t);
    font: var(--type-text);
    letter-spacing: var(--tracking-text);
  }
  .panel:focus {
    outline: none;
  }
  .head {
    flex: none;
    height: 36px;
    box-sizing: border-box;
    padding: 0 var(--space-12);
    display: flex;
    align-items: center;
    gap: var(--space-8);
    white-space: nowrap;
  }
  .muted {
    color: var(--m);
  }
  .tag {
    padding: 0 var(--space-8);
    line-height: 22px;
    font-weight: 500;
    color: var(--solid-ink);
    background: var(--r1);
  }
  .tag[data-hue='r2'] {
    background: var(--r2);
  }
  .tag[data-hue='r3'] {
    background: var(--r3);
  }
  .tag[data-hue='l'] {
    background: var(--l);
  }
  .btn {
    height: 32px;
    box-sizing: border-box;
    padding: 0 var(--space-12);
    border: 0;
    border-radius: 4px;
    background: var(--btn);
    color: var(--t);
    font: inherit;
    cursor: pointer;
  }
  .close {
    margin-left: auto;
    color: var(--t2);
  }
  .search {
    flex: none;
    padding: 0 var(--space-12);
  }
  .scroll {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
  }
  .group {
    margin: 0 var(--space-12);
    height: 28px;
    box-sizing: border-box;
    padding-bottom: var(--space-4);
    display: flex;
    align-items: flex-end;
    border-bottom: 1px solid var(--line);
    color: var(--m);
    font-size: 12px;
  }
  .row {
    width: 100%;
    height: 32px;
    box-sizing: border-box;
    padding: 0 var(--space-12);
    border: 0;
    border-bottom: 1px solid var(--line);
    border-radius: 0;
    background: none;
    display: grid;
    grid-template-columns: 28px minmax(0, 1fr) 84px 16px;
    align-items: center;
    column-gap: var(--space-8);
    text-align: left;
    color: var(--t);
    font: inherit;
    cursor: pointer;
  }
  .row:focus-visible {
    outline: 1px solid var(--focus);
    outline-offset: -1px;
  }
  .row.on {
    background: var(--t);
    color: var(--g);
  }
  .num {
    text-align: right;
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--m);
  }
  .num.none {
    color: var(--d);
  }
  .name {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: var(--space-8);
    white-space: nowrap;
  }
  .text {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .now {
    flex: none;
    font-size: 12px;
    font-weight: 500;
  }
  .src {
    font-size: 12px;
    color: var(--m);
    white-space: nowrap;
  }
  .src.mine {
    color: var(--a);
  }
  .star {
    fill: none;
    stroke: var(--d);
  }
  .star.fav {
    fill: var(--t);
    stroke: var(--t);
  }
  .row.on .num,
  .row.on .src {
    color: var(--g);
  }
  .row.on .star.fav {
    fill: var(--g);
    stroke: var(--g);
  }
  .empty {
    margin: var(--space-12);
    color: var(--m);
  }
  .foot {
    flex: none;
    height: 40px;
    box-sizing: border-box;
    padding: 0 var(--space-12);
    display: flex;
    align-items: center;
    gap: var(--space-12);
    white-space: nowrap;
  }
  .hint {
    margin-left: auto;
    font-size: 12px;
    color: var(--m);
  }
</style>
