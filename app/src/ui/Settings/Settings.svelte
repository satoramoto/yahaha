<!--
  Settings: the Settings page at 1440 × 900, a full-screen page in place of the Stage. The app bar
  and the section row as on the Stage; then a left column (the compact now-playing block over the
  six pages as a list, the open one the chosen block) beside the open page under its header; the
  status line and the keys at the foot. Every page stays mounted (the others hidden), so switching
  is instant. Each region takes its data as one object; every change goes out through its page's
  callback.
-->
<script lang="ts">
  import type { Component, ComponentProps } from 'svelte'
  import type { Action } from 'svelte/action'
  import AppBar from '../AppBar/AppBar.svelte'
  import GroupHeader from '../GroupHeader/GroupHeader.svelte'
  import Keys from '../Keys/Keys.svelte'
  import NowPlayingCompact from '../NowPlayingCompact/NowPlayingCompact.svelte'
  import PageList from '../PageList/PageList.svelte'
  import SectionRow from '../SectionRow/SectionRow.svelte'
  import SettingsChord from '../SettingsChord/SettingsChord.svelte'
  import SettingsKeyboard from '../SettingsKeyboard/SettingsKeyboard.svelte'
  import SettingsLaunchkey from '../SettingsLaunchkey/SettingsLaunchkey.svelte'
  import SettingsPedals from '../SettingsPedals/SettingsPedals.svelte'
  import SettingsStyle from '../SettingsStyle/SettingsStyle.svelte'
  import SettingsSystem from '../SettingsSystem/SettingsSystem.svelte'
  import StatusLine from '../StatusLine/StatusLine.svelte'
  import type {
    ChordChange,
    ChordPageData,
    KeyboardChange,
    KeyboardPageData,
    LaunchkeyChange,
    LaunchkeyPageData,
    NowPlayingCompactData,
    PedalsChange,
    PedalsPageData,
    SettingsPageId,
    SettingsPageItem,
    StyleChange,
    StylePageData,
    SystemChange,
    SystemPageData,
  } from './types'

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

  type Props = {
    /** The app bar: pages (Settings chosen), Launchkey, audio health. */
    appBar: Data<typeof AppBar>
    /** The section row: the transport and the helpers, as on the Stage. */
    sectionRow: Data<typeof SectionRow>
    /** The compact now-playing block at the head of the left column. */
    nowPlaying: NowPlayingCompactData
    /** The six pages, with what each is set to. */
    pages: SettingsPageItem[]
    /** The open page. */
    page: SettingsPageId
    chord: ChordPageData
    style: StylePageData
    keyboard: KeyboardPageData
    pedals: PedalsPageData
    system: SystemPageData
    launchkey: LaunchkeyPageData
    /** The status line above the keys. */
    status: Data<typeof StatusLine>
    /** The keys: range, split, held notes. */
    keys: ComponentProps<typeof Keys>
    /** The app's tooltip action (`use:tip`), passed to every region. */
    tipAction?: Action<HTMLElement, string>
    /** A page in the list was chosen. */
    onpage?: (id: SettingsPageId) => void
    /** A change on the Chord & Split page. */
    onchord?: (change: ChordChange) => void
    /** A change on the Style page. */
    onstyle?: (change: StyleChange) => void
    /** A change on the Keyboard page. */
    onkeyboard?: (change: KeyboardChange) => void
    /** A change on the Pedals page. */
    onpedals?: (change: PedalsChange) => void
    /** A change on the System page. */
    onsystem?: (change: SystemChange) => void
    /** A change on the Launchkey page. */
    onlaunchkey?: (change: LaunchkeyChange) => void
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

  const current = $derived(p.pages.find((item) => item.id === p.page) ?? p.pages[0])
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
  <section class="body" aria-label="Settings">
    <div class="side">
      <NowPlayingCompact {...p.nowPlaying} />
      <div class="list">
        <GroupHeader title="Settings" level={2} />
        <PageList
          pages={p.pages}
          chosen={p.page}
          label="Settings pages"
          tipAction={p.tipAction}
          onchoose={(id) => p.onpage?.(id as SettingsPageId)}
        />
      </div>
    </div>
    <div class="page">
      <GroupHeader title={current?.label ?? ''} level={2} id="settings-page-title">
        {#snippet end()}
          {#if current?.also}<span class="also">{current.also}</span>{/if}
        {/snippet}
      </GroupHeader>
      <div class="pages">
        <div class="slot" data-page="chord" hidden={p.page !== 'chord'}>
          <SettingsChord data={p.chord} tipAction={p.tipAction} onchange={p.onchord} />
        </div>
        <div class="slot" data-page="style" hidden={p.page !== 'style'}>
          <SettingsStyle data={p.style} tipAction={p.tipAction} onchange={p.onstyle} />
        </div>
        <div class="slot" data-page="keyboard" hidden={p.page !== 'keyboard'}>
          <SettingsKeyboard data={p.keyboard} tipAction={p.tipAction} onchange={p.onkeyboard} />
        </div>
        <div class="slot" data-page="pedals" hidden={p.page !== 'pedals'}>
          <SettingsPedals data={p.pedals} tipAction={p.tipAction} onchange={p.onpedals} />
        </div>
        <div class="slot" data-page="system" hidden={p.page !== 'system'}>
          <SettingsSystem data={p.system} tipAction={p.tipAction} onchange={p.onsystem} />
        </div>
        <div class="slot" data-page="launchkey" hidden={p.page !== 'launchkey'}>
          <SettingsLaunchkey data={p.launchkey} tipAction={p.tipAction} onchange={p.onlaunchkey} />
        </div>
      </div>
    </div>
  </section>
  <StatusLine {...p.status} tipAction={p.tipAction} onclear={p.onclear} />
  <Keys {...p.keys} />
</div>

<style>
  .screen {
    --settings-side-width: 320px;
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
  .body {
    display: flex;
    flex: 1;
    gap: var(--band-gap);
    min-height: 0;
    margin-top: var(--stage-gap-display);
    margin-bottom: var(--space-8);
  }
  .side {
    display: flex;
    flex: none;
    flex-direction: column;
    gap: var(--space-20);
    width: var(--settings-side-width);
  }
  .list {
    display: flex;
    flex-direction: column;
  }
  .page {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: var(--header-gap);
    min-width: 0;
    min-height: 0;
  }
  .also {
    color: var(--caption-ink);
    font: var(--type-text);
    letter-spacing: var(--tracking-text);
  }
  .pages {
    flex: 1;
    min-height: 0;
    overflow: auto;
  }
  .slot[hidden] {
    display: none;
  }
</style>
