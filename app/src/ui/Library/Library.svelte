<!--
  Library: the Library page at 1440 × 900 (docs/specs/push/Browser.md, Layout; the LibrarySounds,
  LibraryInstruments and LibraryRacks boards). A thin layout of components: the app bar (Library
  chosen), the section row, the page, the status line and the keys. The page is a "Library" header
  whose ChosenTabs pick the Library page (Styles, Sounds, Instruments, Racks, Style map), over a
  320px left column (the Quick Racks bar at its top), a hairline, and the
  chosen page's component. The board's half-height band isn't drawn yet: the page takes its height.
  Each page's props (data and callbacks) come as one object; only the chosen page is rendered. The
  Style map page is the parent's `map` snippet (or a placeholder line without one).
-->
<script lang="ts">
  import type { Component, ComponentProps, Snippet } from 'svelte'
  import type { Action } from 'svelte/action'
  import AppBar from '../AppBar/AppBar.svelte'
  import ChosenTabs from '../ChosenTabs/ChosenTabs.svelte'
  import type { TabItem } from '../ChosenTabs/types'
  import GroupHeader from '../GroupHeader/GroupHeader.svelte'
  import Keys from '../Keys/Keys.svelte'
  import LibraryInstruments from '../LibraryInstruments/LibraryInstruments.svelte'
  import LibraryRacks from '../LibraryRacks/LibraryRacks.svelte'
  import LibrarySounds from '../LibrarySounds/LibrarySounds.svelte'
  import LibraryStyles from '../LibraryStyles/LibraryStyles.svelte'
  import QuickRacksBar from '../QuickRacksBar/QuickRacksBar.svelte'
  import SectionRow from '../SectionRow/SectionRow.svelte'
  import StatusLine from '../StatusLine/StatusLine.svelte'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type Any = Component<any>
  /** A region's data: its props without `tipAction` and the `on…` callbacks. */
  type DataOf<P> = {
    [K in keyof P as K extends 'tipAction'
      ? never
      : K extends `on${string}`
        ? NonNullable<P[K]> extends (...args: never[]) => unknown
          ? never
          : K
        : K]: P[K]
  }
  type Data<C extends Any> = DataOf<ComponentProps<C>>
  type On<C extends Any, K extends keyof ComponentProps<C>> = Pick<ComponentProps<C>, K>
  /** A page's props without the shared tooltip action (the screen passes it). */
  type Page<C extends Any> = Omit<ComponentProps<C>, 'tipAction'>

  type Props = {
    /** The app bar: pages (Library chosen), Launchkey, audio health. */
    appBar: Data<typeof AppBar>
    /** The section row: the transport and the helpers, as on the Stage. */
    sectionRow: Data<typeof SectionRow>
    /** The Library pages, left to right (labels may carry their counts: "Styles 1,284"). */
    pages: TabItem[]
    /** The `id` of the Library page shown: `styles`, `sounds`, `instruments`, `racks` or `map`. */
    page: string
    /** The Quick Racks bar at the top of the left column: the bank on view and its eight slots. */
    quickRacks: Data<typeof QuickRacksBar>
    /** Styles: the page's data and callbacks. Needed when `page` is `styles`. */
    styles?: Page<typeof LibraryStyles>
    /** Sounds: the page's data and callbacks. Needed when `page` is `sounds`. */
    sounds?: Page<typeof LibrarySounds>
    /** Instruments: the page's data and callbacks. Needed when `page` is `instruments`. */
    instruments?: Page<typeof LibraryInstruments>
    /** Racks: the page's data and callbacks. Needed when `page` is `racks`. */
    racks?: Page<typeof LibraryRacks>
    /** The Style map page's content; without it, a line saying it isn't rebuilt yet. */
    map?: Snippet
    /** The status line above the keys (empty when `text` is null). */
    status: Data<typeof StatusLine>
    /** The keys: range, split, held notes. */
    keys: ComponentProps<typeof Keys>
    /** The app's tooltip action (`use:tip`), passed to every region. */
    tipAction?: Action<HTMLElement, string>
    /** A Library page tab was chosen, with its `id`. */
    onpage?: (id: string) => void
    /** Quick Racks: ◀ or ▶ stepped the bank. */
    onquickbank?: (delta: -1 | 1) => void
    /** Quick Racks: Store was pressed. */
    onquickstore?: () => void
    /** Quick Racks: Clear was pressed. */
    onquickclear?: () => void
    /** Quick Racks: a slot was pressed, with its index (0–7). */
    onquickslot?: (index: number) => void
    /** Quick Racks: a slot was held or right-clicked, with its index (0–7). */
    onquickslotlong?: (index: number) => void
  } & On<typeof AppBar, 'onchoose' | 'onhealth'> &
    On<
      typeof SectionRow,
      | 'onstartstop'
      | 'onaccomp'
      | 'onsyncstart'
      | 'onreset'
      | 'onfillup'
      | 'onfilldown'
      | 'onfade'
      | 'onmetronome'
      | 'onmetronomesettings'
      | 'onunison'
      | 'onpanic'
      | 'onhelp'
    > &
    On<typeof StatusLine, 'onclear'>

  let p: Props = $props()

  /** The chosen page's word, without the count its tab label carries ("Styles 1,284" → "Styles"). */
  const pageName = $derived((p.pages.find((t) => t.id === p.page)?.label ?? '').replace(/\s+[\d,]+$/, ''))
</script>

<div class="screen">
  <AppBar {...p.appBar} tipAction={p.tipAction} onchoose={p.onchoose} onhealth={p.onhealth} />
  <div class="row">
    <SectionRow
      {...p.sectionRow}
      tipAction={p.tipAction}
      onstartstop={p.onstartstop}
      onaccomp={p.onaccomp}
      onsyncstart={p.onsyncstart}
      onreset={p.onreset}
      onfillup={p.onfillup}
      onfilldown={p.onfilldown}
      onfade={p.onfade}
      onmetronome={p.onmetronome}
      onmetronomesettings={p.onmetronomesettings}
      onunison={p.onunison}
      onpanic={p.onpanic}
      onhelp={p.onhelp}
    />
  </div>
  <section class="page" aria-label={`Library: ${pageName}`}>
    <GroupHeader title="Library">
      <ChosenTabs tabs={p.pages} chosen={p.page} size="header" label="Library pages" tipAction={p.tipAction} onchoose={p.onpage} />
    </GroupHeader>
    <div class="body">
      <div class="left">
        <div class="quick">
          <QuickRacksBar
            {...p.quickRacks}
            tipAction={p.tipAction}
            onbank={p.onquickbank}
            onstore={p.onquickstore}
            onclear={p.onquickclear}
            onslot={p.onquickslot}
            onslotlong={p.onquickslotlong}
          />
        </div>
      </div>
      <div class="hairline" aria-hidden="true"></div>
      <div class="content">
        {#if p.page === 'styles' && p.styles}
          <LibraryStyles {...p.styles} tipAction={p.tipAction} />
        {:else if p.page === 'sounds' && p.sounds}
          <LibrarySounds {...p.sounds} tipAction={p.tipAction} />
        {:else if p.page === 'instruments' && p.instruments}
          <LibraryInstruments {...p.instruments} tipAction={p.tipAction} />
        {:else if p.page === 'racks' && p.racks}
          <LibraryRacks {...p.racks} tipAction={p.tipAction} />
        {:else if p.page === 'map' && p.map}
          <div class="map">{@render p.map()}</div>
        {:else}
          <p class="none">{pageName ? `${pageName} isn't rebuilt yet.` : 'Choose a Library page.'}</p>
        {/if}
      </div>
    </div>
  </section>
  <div class="status">
    <StatusLine {...p.status} tipAction={p.tipAction} onclear={p.onclear} />
  </div>
  <Keys {...p.keys} />
</div>

<style>
  .screen {
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    width: var(--screen-width);
    height: var(--screen-height);
    padding: var(--screen-pad);
    overflow: hidden;
    background: var(--g);
    color: var(--t);
    font-family: var(--font-sans);
  }
  .row {
    display: flex;
    flex: none;
    margin-top: var(--stage-gap-row);
  }
  .page {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
    margin-top: var(--stage-gap-display);
    overflow: hidden;
  }
  .body {
    display: flex;
    flex: 1;
    gap: var(--space-24);
    min-height: 0;
    margin-top: var(--header-gap);
  }
  .left {
    display: flex;
    flex: none;
    flex-direction: column;
    width: 320px;
    min-height: 0;
  }
  .quick {
    display: flex;
  }
  .quick > :global(*) {
    flex: 1;
  }
  .hairline {
    flex: none;
    width: var(--line-width);
    background: var(--line);
  }
  .content {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
  }
  .content > :global(*) {
    flex: 1;
    min-height: 0;
  }
  .map {
    overflow: auto;
  }
  .none {
    margin: 0;
    color: var(--m);
    font: var(--type-text);
    letter-spacing: var(--tracking-text);
  }
  /* As on the Stage, the status line is the 20px gap between the page and the keys. */
  .status {
    display: flex;
    flex: none;
  }
  .status > :global(*) {
    flex: 1;
  }
</style>
