<!--
  Picks a sound for a program map rule (Library › Style map, `ui.soundPick`), on the Push
  Dialog (ui/Dialog, the SoundPicker board): a modal list
  of every sound, with the Sounds tab's chips and filter. Enter or a click hands the sound
  over and closes. It is what is left of the old Sound Browser (#117), which Library
  replaced (docs/racks.md, item 13).

  ┌ All sounds   ┐┌ Filter ─────────────────────────────── 142 of 1,219 ┐
  │ ★ Favourites ││ ☆ Grand Piano      SF  GeneralUser-GS · GM 1        │  virtualised
  │ ↺ Recent     ││ ☆ Silk Strings     Mine Sampler Deluxe              │
  │ ● My Sounds  ││ …                                                   │
  │ CATEGORIES   │├ Pick the sound for Piano family ────────────────────┤
  │ INSTRUMENTS  │└─────────────────────────────────────────────────────┘
  └──────────────┘

  Keys (the filter keeps focus): ↑/↓ PgUp/PgDn Home/End move; Enter picks; Ctrl/⌘+D
  stars; Esc closes. Tab reaches every chip.
-->
<script lang="ts">
  import { onMount, tick } from 'svelte'
  import type { GmMapRow } from '../../lib/api/types'
  import { app, ui, type SoundPick } from '../../lib/store.svelte'
  import { tip, tips } from '../../lib/tooltip/tip.svelte'
  import Dialog from '../../ui/Dialog/Dialog.svelte'
  import { moveCursor } from '../library/styleIndex'
  import { SOURCE_BADGE, allSoundIds, categoryCounts, instruments, mapSlots, patchesById, soundNumber, visibleSounds, type SoundView } from './model'

  let { pick }: { pick: SoundPick } = $props()

  const ROW = 36
  const OVERSCAN = 8
  // One empty GM map, so an engine without one doesn't make a new array per state.
  const NO_ROWS: GmMapRow[] = []

  const catalog = $derived(app.sounds)
  const entries = $derived(catalog.entries)
  // The slices themselves, so a state that leaves them alone re-runs nothing below.
  const patches = $derived(app.state.soundLibrary.patches)
  const gmMap = $derived(app.state.soundLibrary.gmMap ?? NO_ROWS)
  const ctx = $derived.by(() => ({ patches, gmMap }))
  let view = $state<SoundView>({ kind: 'all' })
  let query = $state('')
  const rows = $derived(visibleSounds(catalog, view, query, ctx))
  const listingPresets = $derived(app.state.sounds?.listingPresets)
  const listing = $derived(new Set(listingPresets ?? []))
  const slots = $derived(mapSlots(gmMap))
  const byId = $derived(patchesById(patches))
  const allIds = $derived(allSoundIds(ctx))
  const allCount = $derived(entries.reduce((n, e) => n + (allIds.has(e.id) ? 1 : 0), 0))
  const cats = $derived(categoryCounts(entries.filter((e) => allIds.has(e.id))))
  const insts = $derived(instruments(catalog))
  const favourites = $derived(entries.reduce((n, e) => n + (e.favourite ? 1 : 0), 0))
  const mine = $derived(entries.reduce((n, e) => n + (e.source === 'saved' ? 1 : 0), 0))
  // The library patch the rule names now.
  const playing = $derived(pick.value ? `saved:${pick.value}` : null)

  let cursorId = $state<string | null>(null)
  // No row is active while the rule's sound (or the one moved to) isn't in the list. ↓
  // then starts at the top.
  const cursor = $derived(rows.findIndex((i) => entries[i].id === (cursorId ?? playing)))
  // Typing a filter that hides the row moved to moves to its first match, so Enter picks it.
  function onfilter() {
    if (cursor < 0 && rows.length) cursorId = entries[rows[0]].id
    ensureVisible(cursor, true)
  }

  let list: HTMLDivElement | undefined = $state()
  let input: HTMLInputElement | undefined = $state()
  let scrollTop = $state(0)
  let height = $state(480)
  const first = $derived(Math.max(0, Math.floor(scrollTop / ROW) - OVERSCAN))
  const last = $derived(Math.min(rows.length, Math.ceil((scrollTop + height) / ROW) + OVERSCAN))
  const slice = $derived(rows.slice(first, last))

  function ensureVisible(k: number, center = false) {
    if (!list) return
    const h = list.clientHeight || height
    const top = Math.max(0, k) * ROW
    if (center) list.scrollTop = Math.max(0, top - h / 2 + ROW / 2)
    else if (top < list.scrollTop) list.scrollTop = top
    else if (top + ROW > list.scrollTop + h) list.scrollTop = top + ROW - h
    scrollTop = list.scrollTop
  }

  function choose(i: number) {
    const e = entries[i]
    if (!e) return
    pick.onpick(e.id)
    ui.soundPick = null
  }
  const close = () => (ui.soundPick = null)
  const star = (i: number) => entries[i] && app.send({ type: 'setSoundFavourite', id: entries[i].id, on: !entries[i].favourite })

  function show(v: SoundView) {
    view = v
    // A plugin's factory presets need an instance: the engine lists them once, then
    // answers from its cache.
    if (v.kind === 'instrument' && v.id.startsWith('au:')) {
      const e = entries.find((x) => x.id === v.id)
      // A failed listing is not tried again (until the next scan): it says why instead.
      if (e?.plugin && !e.plugin.lastError && !e.plugin.presetsError && !listing.has(v.id)) app.send({ type: 'listPluginPresets', id: v.id })
    }
    void tick().then(() => ensureVisible(cursor, true))
  }

  function onkey(e: KeyboardEvent) {
    const m = moveCursor(e.key, cursor, rows.length, Math.max(1, Math.floor(height / ROW) - 1))
    if (m !== null) {
      e.preventDefault()
      cursorId = entries[rows[m]].id
      ensureVisible(m)
      return
    }
    const i = rows[cursor]
    if (e.key === 'Enter') {
      e.preventDefault()
      if (i !== undefined) choose(i)
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
      e.preventDefault()
      if (i !== undefined) star(i)
    }
  }

  $effect(() => {
    const el = list
    if (!el) return
    const measure = () => (height = el.clientHeight || height)
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  })

  onMount(() => {
    void tick().then(() => {
      input?.focus()
      ensureVisible(cursor, true)
    })
  })

  const is = (v: SoundView) => v.kind === view.kind && (v.kind !== 'category' || (view.kind === 'category' && view.id === v.id)) && (v.kind !== 'instrument' || (view.kind === 'instrument' && view.id === v.id))
  const slotText = (id: string) => {
    const s = slots.get(id)
    return s === undefined ? '' : s === 'drums' ? 'GM drums · ' : `GM ${s + 1} · `
  }
  const chipId = $derived(view.kind === 'instrument' ? view.id : null)
  const shownName = $derived(chipId ? (insts.find((x) => x.id === chipId)?.name ?? '') : '')
  const listingChip = $derived(!!chipId && listing.has(chipId))
  const chipError = $derived(chipId ? entries.find((e) => e.id === chipId)?.plugin?.presetsError : undefined)
  // "N of M": M is what the chip holds, before the filter.
  const chipTotal = $derived(query.trim() ? visibleSounds(catalog, view, '', ctx).length : rows.length)
</script>

<Dialog title="Sounds · {pick.title}" width={1040} onclose={close}>
  <div class="sb">
    <nav class="side" aria-label="Sound chips">
      <button type="button" class="cat" class:on={is({ kind: 'all' })} aria-pressed={is({ kind: 'all' })} use:tip={'sounds.all'} onclick={() => show({ kind: 'all' })}>
        <span>All sounds</span><span class="n">{allCount.toLocaleString()}</span>
      </button>
      <button type="button" class="cat" class:on={is({ kind: 'favourites' })} aria-pressed={is({ kind: 'favourites' })} use:tip={'sounds.favourites'} onclick={() => show({ kind: 'favourites' })}>
        <span><span class="ico" aria-hidden="true">★</span> Favourites</span><span class="n">{favourites}</span>
      </button>
      <button type="button" class="cat" class:on={is({ kind: 'recents' })} aria-pressed={is({ kind: 'recents' })} use:tip={'sounds.recents'} onclick={() => show({ kind: 'recents' })}>
        <span><span class="ico" aria-hidden="true">↺</span> Recent</span><span class="n">{catalog.recents.length}</span>
      </button>
      <button type="button" class="cat" class:on={is({ kind: 'mine' })} aria-pressed={is({ kind: 'mine' })} use:tip={'sounds.saved'} onclick={() => show({ kind: 'mine' })}>
        <span><span class="ico" aria-hidden="true">●</span> My Sounds</span><span class="n">{mine}</span>
      </button>
      <h3>Categories</h3>
      {#each cats as c (c.id)}
        {@const v: SoundView = { kind: 'category', id: c.id }}
        <button type="button" class="cat sub" class:on={is(v)} aria-pressed={is(v)} use:tip={'sounds.category'} onclick={() => show(v)}>
          <span>{c.label}</span><span class="n">{c.count.toLocaleString()}</span>
        </button>
      {/each}
      {#if insts.length}
        <h3>Instruments</h3>
        {#each insts as ins (ins.id)}
          {@const v: SoundView = { kind: 'instrument', id: ins.id }}
          <button type="button" class="cat sub inst" class:on={is(v)} aria-pressed={is(v)} use:tip={'sounds.instrument'} onclick={() => show(v)}>
            <span class="iname">{ins.name}</span><span class="n">{ins.kind === 'soundFont' ? 'SF' : 'AU'}</span>
          </button>
        {/each}
      {/if}
    </nav>

    <section class="main">
      <div class="filter">
        <input
          bind:this={input}
          bind:value={query}
          type="text"
          placeholder="Filter by name, file or maker"
          spellcheck="false"
          autocomplete="off"
          role="combobox"
          aria-expanded="true"
          aria-controls="sounds-list"
          aria-autocomplete="list"
          aria-activedescendant={rows[cursor] !== undefined ? `sound-${rows[cursor]}` : undefined}
          aria-label="Filter sounds"
          use:tip={'sounds.filter'}
          onkeydown={onkey}
          oninput={() => void tick().then(onfilter)}
          onfocus={() => queueMicrotask(() => input && tips.hide(input))}
        />
        <span class="count">{rows.length.toLocaleString()} of {chipTotal.toLocaleString()}{#if listingChip}&nbsp;· listing presets{:else if chipError}<span class="warn" title={chipError}>&nbsp;· presets not listed: {chipError}</span>{:else if app.state.sounds?.scanning}&nbsp;· scanning plugins{/if}</span>
      </div>

      <div class="screen">
        <div class="scroller" bind:this={list} onscroll={() => (scrollTop = list?.scrollTop ?? 0)}>
          <div class="rows" id="sounds-list" role="listbox" tabindex="-1" aria-label="Sounds" style:height="{rows.length * ROW}px">
            {#each slice as i, k (entries[i].id)}
              {@const e = entries[i]}
              {@const n = soundNumber(e, byId)}
              <!-- svelte-ignore a11y_click_events_have_key_events (the filter field drives the list: ↑/↓, Enter) -->
              <div
                class="row"
                class:active={first + k === cursor}
                class:playing={e.id === playing}
                role="option"
                tabindex="-1"
                id="sound-{i}"
                aria-selected={first + k === cursor}
                style:transform="translateY({(first + k) * ROW}px)"
                use:tip={e.plugin?.lastError ? 'sounds.row_failed' : 'sounds.row_pick'}
                onclick={() => ((cursorId = e.id), choose(i))}
              >
                <button type="button" class="star" class:on={e.favourite} tabindex="-1" aria-label={e.favourite ? 'Unstar' : 'Star'} aria-pressed={e.favourite} use:tip={'sounds.favourite'} onclick={(ev) => (ev.stopPropagation(), star(i))}>{e.favourite ? '★' : '☆'}</button>
                <span class="mark" aria-hidden="true">{e.id === playing ? '▶' : ''}</span>
                {#if n !== null}<span class="num" use:tip={'sound.number'}>{n}</span>{:else}<span class="num"></span>{/if}
                <span class="name">{e.name}</span>
                <span class="badge {e.source}">{SOURCE_BADGE[e.source]}</span>
                <span class="detail">{view.kind === 'all' || view.kind === 'category' ? slotText(e.id) : ''}{e.detail}{#if e.plugin?.lastError}<span class="warn" title={e.plugin.lastError}> ⚠ {e.plugin.lastError}</span>{/if}</span>
              </div>
            {/each}
          </div>
          {#if rows.length === 0}
            <p class="empty">
              {#if entries.length === 0}No sounds yet: no SoundFonts, plugins or saved sounds.
              {:else if view.kind === 'favourites' && !query}No favourites yet: star a sound with ☆ (or Ctrl+D).
              {:else if view.kind === 'recents' && !query}Nothing picked yet.
              {:else if view.kind === 'mine' && !query}Nothing in My Sounds yet.
              {:else if chipId && !query}{listingChip ? `Listing ${shownName}'s presets…` : chipError ? `Could not list ${shownName}'s presets: ${chipError}` : `${shownName} has no presets.`}
              {:else}No sound matches “{query}”.{/if}
            </p>
          {/if}
        </div>
      </div>

      <footer class="foot">
        <span class="now">Pick the sound for <b>{pick.title}</b></span>
        <button type="button" class="close" use:tip={'sounds.close'} onclick={close}>Close</button>
      </footer>
    </section>
  </div>
</Dialog>

<style>
  .sb {
    display: grid;
    grid-template-columns: 12rem minmax(0, 1fr);
    gap: var(--space-16);
    height: min(640px, calc(100vh - 160px));
    min-height: 0;
  }
  .side {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-height: 0;
    overflow: auto;
  }
  h3 {
    margin: var(--space-12) var(--space-8) var(--space-4);
    padding-bottom: var(--space-4);
    border-bottom: 1px solid var(--line);
    color: var(--m);
    font-size: 12px;
    font-weight: 400;
  }
  .cat {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-8);
    min-height: 32px;
    padding: 0 var(--space-8);
    border: 0;
    border-radius: 0;
    background: none;
    text-align: left;
    font: inherit;
    color: var(--t);
    cursor: pointer;
  }
  .cat:hover {
    background: var(--btn);
  }
  .cat.on {
    background: var(--t);
    color: var(--g);
  }
  .cat.on .n,
  .cat.on .ico {
    color: var(--g);
  }
  .iname {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .ico {
    color: var(--a);
  }
  .n {
    color: var(--m);
    font-size: 12px;
  }
  .main {
    display: flex;
    flex-direction: column;
    gap: var(--space-8);
    min-width: 0;
    min-height: 0;
  }
  .filter {
    display: flex;
    align-items: center;
    gap: var(--space-12);
    border-bottom: 1px solid var(--t);
  }
  .filter input {
    flex: 1;
    min-width: 0;
    height: 34px;
    padding: 0;
    border: 0;
    background: none;
    color: var(--t);
    font: inherit;
    outline: none;
  }
  .count {
    white-space: nowrap;
    color: var(--m);
    font-size: 12px;
  }
  .screen {
    flex: 1;
    min-height: 0;
    display: flex;
    overflow: hidden;
  }
  .scroller {
    position: relative;
    flex: 1;
    overflow-y: auto;
    overscroll-behavior: contain;
  }
  .rows {
    position: relative;
  }
  .row {
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    height: 36px;
    display: grid;
    grid-template-columns: 1.8rem 1rem 2.2rem minmax(8rem, 1.4fr) 3.2rem minmax(0, 1fr);
    align-items: center;
    column-gap: var(--space-8);
    padding: 0 var(--space-8) 0 var(--space-4);
    box-sizing: border-box;
    border-bottom: 1px solid var(--line);
    color: var(--t);
    cursor: pointer;
    white-space: nowrap;
    contain: layout paint;
  }
  .row:hover {
    background: var(--btn);
  }
  .row.active {
    background: var(--t);
    color: var(--g);
  }
  .row.active .num,
  .row.active .detail,
  .row.active .star,
  .row.active .badge {
    color: var(--g);
  }
  .row.playing .name,
  .mark {
    color: var(--a);
  }
  .row.active.playing .name,
  .row.active .mark {
    color: var(--g);
  }
  .num {
    text-align: right;
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--m);
  }
  .name,
  .detail {
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
  }
  .detail {
    color: var(--m);
    font-size: 12px;
  }
  .warn {
    color: var(--rec);
  }
  .badge {
    justify-self: start;
    color: var(--m);
    font-size: 12px;
  }
  .badge.saved {
    color: var(--a);
  }
  button.star {
    border: 0;
    background: none;
    padding: 0;
    height: 36px;
    color: var(--d);
    cursor: pointer;
  }
  .star.on {
    color: var(--t);
  }
  .empty {
    position: absolute;
    inset: var(--space-24) var(--space-16) auto;
    margin: 0;
    text-align: center;
    color: var(--m);
  }
  .foot {
    display: flex;
    align-items: center;
    gap: var(--space-12);
    min-height: 40px;
  }
  .now {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 12px;
    color: var(--m);
  }
  .now b {
    color: var(--t);
    font-weight: 500;
  }
  .close {
    height: 32px;
    padding: 0 var(--space-12);
    border: 0;
    border-radius: 4px;
    background: var(--btn);
    color: var(--t2);
    font: inherit;
    cursor: pointer;
  }
</style>
