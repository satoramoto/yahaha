<!--
  RackMapEditor: the controller map editor the Rack's "Edit map" opens, in place of the parts
  table (docs/design/push/Rack-MapEdit-Dark.dc.html). Three columns: Panel faders 1–4, Rack knobs
  1–4 and 5–8. Each row is a controller, its target picker and the target's live value in the
  part's hue; a changed row (not the default map) carries the 5px dot. A picker opens a listbox
  under its row: the rack-wide targets, then a part's targets behind R1 R2 R3 L tabs (the tab of
  the current target's part first). Tempo is for knobs only: dimmed on a fader's picker. Picking
  calls `onpick` and closes it; Esc or a click outside closes it too.
-->
<script lang="ts">
  import type { Action } from 'svelte/action'
  import ChosenTabs from '../ChosenTabs/ChosenTabs.svelte'
  import type { MapControl, MapOption, MapPart, MapRow } from './types'

  type Props = {
    /** Panel faders 1-4 (the Volume layer). */
    faders: MapRow[]
    /** Rack knobs 1-8 (knob page 2). */
    knobs: MapRow[]
    /** The rack-wide targets, in the picker's top grid. */
    rack: MapOption[]
    /** The four parts' targets, behind the picker's part tabs. */
    parts: MapPart[]
    /** The app's `use:tip` action. */
    tipAction?: Action<HTMLElement, string>
    /** A target was picked for a controller. */
    onpick?: (control: MapControl, index: number, key: string) => void
  }

  let { faders, knobs, rack, parts, tipAction, onpick }: Props = $props()

  /** The open picker's row, `fader:0` …; null when none is open. */
  let open = $state<string | null>(null)
  /** The part tab on view in the open picker. */
  let partTab = $state(0)
  let box: HTMLDivElement | undefined = $state()

  const rowId = (r: MapRow) => `${r.control}:${r.index}`
  const openRow = $derived([...faders, ...knobs].find((r) => rowId(r) === open) ?? null)

  function tipOn(node: HTMLElement, key: string | undefined) {
    if (!tipAction || !key) return
    return tipAction(node, key)
  }

  function toggle(r: MapRow) {
    if (open === rowId(r)) {
      open = null
      return
    }
    open = rowId(r)
    const i = parts.findIndex((p) => p.options.some((o) => o.key === r.key))
    partTab = i >= 0 ? i : 0
  }

  function pick(o: MapOption) {
    const r = openRow
    if (!r || (o.knobsOnly && r.control !== 'knob')) return
    onpick?.(r.control, r.index, o.key)
    open = null
  }

  function onwindowdown(e: PointerEvent) {
    if (open && box && e.target instanceof Node && !box.contains(e.target)) open = null
  }
  function onkeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && open) {
      e.preventDefault()
      e.stopPropagation()
      open = null
    }
  }

  const columns = $derived([
    { title: 'Panel faders 1–4', note: 'Volume layer', rows: faders },
    { title: 'Rack knobs 1–4', note: 'knob page 2', rows: knobs.slice(0, 4) },
    { title: 'Rack knobs 5–8', note: '', rows: knobs.slice(4) },
  ])
</script>

<svelte:window onpointerdown={onwindowdown} />

<!-- svelte-ignore a11y_no_noninteractive_element_interactions (Esc closes the open picker) -->
<div
  class="editor"
  role="group"
  aria-label="Controller map editor: what Panel faders 1 to 4 and the Rack knob page's knobs 1 to 8 do in this rack"
  bind:this={box}
  {onkeydown}
>
  {#each columns as col (col.title)}
    <div class="col">
      <div class="head">
        <span class="title">{col.title}</span>
        {#if col.note}<span class="note">{col.note}</span>{/if}
      </div>
      {#each col.rows as r (rowId(r))}
        <div class="row">
          <span class="name">{r.name}{#if r.changed}<span class="dot" aria-label="changed from the default map"></span>{/if}</span>
          <button
            type="button"
            class="picker"
            class:open={open === rowId(r)}
            aria-haspopup="listbox"
            aria-expanded={open === rowId(r)}
            aria-controls={open === rowId(r) ? 'rack-map-picker' : undefined}
            aria-label={r.aria}
            data-tip="rack.map_target"
            use:tipOn={'rack.map_target'}
            onclick={() => toggle(r)}
          >
            {#if r.tag}<span class="tag" data-hue={r.hue}>{r.tag}</span>{/if}
            <span class="target">{r.target}</span>
            <span class="caret" aria-hidden="true">{open === rowId(r) ? '▴' : '▾'}</span>
          </button>
          <span class="value" class:word={!/^[−+-]?\d/.test(r.value)} data-hue={r.dim ? 'd' : r.hue}>{r.value}</span>
        </div>
      {/each}
    </div>
  {/each}

  {#if openRow}
    {@const part = parts[partTab]}
    <div
      id="rack-map-picker"
      class="list"
      class:left={openRow.control === 'fader'}
      role="listbox"
      aria-label="{openRow.name} target"
      style:top="{28 + 44 * ((openRow.control === 'knob' ? openRow.index % 4 : openRow.index) + 1)}px"
    >
      <div class="sub">Rack</div>
      <div class="grid">
        {#each rack as o (o.key)}
          {@const off = o.knobsOnly && openRow.control !== 'knob'}
          <button
            type="button"
            role="option"
            class="opt"
            class:chosen={o.key === openRow.key}
            class:off
            aria-selected={o.key === openRow.key}
            aria-disabled={off ? 'true' : undefined}
            aria-label={o.name ?? (o.knobsOnly ? `${o.label} (knobs only)` : o.label)}
            onclick={() => pick(o)}>{o.label}</button
          >
        {/each}
      </div>
      <div class="rule" aria-hidden="true"></div>
      <div class="parts">
        <span class="sub">Part</span>
        <ChosenTabs
          size="compact"
          label="Part"
          tabs={parts.map((p, i) => ({ id: String(i), label: p.tag, name: p.name, tip: 'rack.map_part' }))}
          chosen={String(partTab)}
          {tipAction}
          onchoose={(id) => (partTab = Number(id))}
        />
        {#if part}<span class="sound">{part.sound}</span>{/if}
      </div>
      {#if part}
        <div class="grid">
          {#each part.options as o (o.key)}
            <button
              type="button"
              role="option"
              class="opt"
              class:chosen={o.key === openRow.key}
              aria-selected={o.key === openRow.key}
              aria-label={o.name ?? o.label}
              onclick={() => pick(o)}>{o.label}</button
            >
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .editor {
    position: relative;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    column-gap: var(--space-24);
    align-content: start;
    height: 220px;
  }
  .col {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .head {
    display: flex;
    align-items: center;
    gap: var(--space-8);
    height: 28px;
    box-sizing: border-box;
    border-bottom: var(--line-width) solid var(--line);
    white-space: nowrap;
  }
  .title {
    color: var(--caption-ink);
    font: var(--type-text);
  }
  .note {
    margin-left: auto;
    color: var(--caption-ink);
    font: var(--type-text);
  }
  .row {
    display: flex;
    align-items: center;
    gap: var(--space-8);
    height: 44px;
    box-sizing: border-box;
    border-bottom: var(--line-width) solid var(--line);
    white-space: nowrap;
  }
  .name {
    display: flex;
    align-items: center;
    gap: var(--space-6);
    flex: none;
    width: 56px;
    color: var(--value-ink);
    font: var(--type-text);
  }
  .dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--t);
  }
  .picker {
    display: flex;
    flex: 1;
    align-items: center;
    gap: var(--space-8);
    min-width: 0;
    height: 32px;
    box-sizing: border-box;
    padding: 0 var(--space-10);
    border: 0;
    border-radius: var(--radius);
    background: var(--btn);
    box-shadow: none;
    color: var(--t);
    font: var(--type-text);
    text-align: left;
    cursor: pointer;
  }
  .picker.open {
    box-shadow: inset 0 0 0 var(--line-width) var(--t);
  }
  .tag {
    flex: none;
    font: var(--type-strong);
  }
  .target {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .caret {
    margin-left: auto;
    color: var(--m);
  }
  .open .caret {
    color: var(--t);
  }
  .value {
    flex: none;
    width: 40px;
    color: var(--t);
    font: var(--type-strong);
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .value.word {
    font: var(--type-text);
  }
  [data-hue='r1'] {
    color: var(--r1);
  }
  [data-hue='r2'] {
    color: var(--r2);
  }
  [data-hue='r3'] {
    color: var(--r3);
  }
  [data-hue='l'] {
    color: var(--l);
  }
  [data-hue='d'] {
    color: var(--d);
  }
  .picker:focus-visible,
  .opt:focus-visible {
    outline: var(--line-width) solid var(--focus);
    outline-offset: 0;
  }
  .list {
    position: absolute;
    right: 0;
    z-index: 2;
    display: flex;
    flex-direction: column;
    width: 424px;
    box-sizing: border-box;
    padding: var(--space-12);
    border: var(--line-width) solid var(--m);
    border-radius: var(--radius);
    background: var(--g);
  }
  .list.left {
    right: auto;
    left: 64px;
  }
  .sub {
    color: var(--caption-ink);
    font: var(--type-text);
    white-space: nowrap;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    grid-auto-rows: 24px;
    gap: var(--space-2) var(--space-4);
    margin-top: var(--space-4);
  }
  .opt {
    min-width: 0;
    padding: 0 var(--space-8);
    border: 0;
    border-radius: var(--radius);
    background: none;
    color: var(--t2);
    font: var(--type-text);
    text-align: left;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    cursor: pointer;
  }
  .opt.chosen {
    background: var(--t);
    color: var(--g);
    font: var(--type-strong);
  }
  .opt.off {
    color: var(--d);
    cursor: default;
  }
  .rule {
    height: var(--line-width);
    margin: var(--space-8) 0;
    background: var(--line);
  }
  .parts {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    white-space: nowrap;
  }
  .sound {
    margin-left: auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--caption-ink);
    font: var(--type-text);
  }
</style>
