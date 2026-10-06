<!--
  LibraryScreen: the app's wiring of the library's Library screen (app/src/ui/Library), shown in
  the Stage's place while `ui.view === 'library'` (the app bar's Library tab, Alt+B, a part's
  sound name). It reads the stores, turns them into the screen's props (frameModel.ts and each
  page's model: stylesModel, soundsModel, instrumentsModel, racksModel), and turns its callbacks
  into commands. The Style map page is today's MapTab, unchanged, until its own spec is built.

  Scaling, as StageScreen: laid out at 1440 × 900 and scaled uniformly to fit, centred, under
  `data-theme` (the kit's tokens).
-->
<script lang="ts">
  import { untrack } from 'svelte'
  import type { Action } from 'svelte/action'
  import type { Meters } from '../../lib/api/types'
  import { dropouts } from '../../lib/dropouts.svelte'
  import { app, ui, type LibraryTab } from '../../lib/store.svelte'
  import { tip, tips } from '../../lib/tooltip/tip.svelte'
  import Library from '../../ui/Library/Library.svelte'
  import { prefs } from '../browser/prefs.svelte'
  import { rangeFor } from '../keystrip/keyboard'
  import { nav as settingsNav } from '../settings/nav.svelte'
  import { stageActions, type OpenTarget } from '../stage/actions'
  import { useStatusHint } from '../stage/hint.svelte'
  import { appBar, keys, status } from '../stage/model'
  import { stagePage } from '../stage/page.svelte'
  import { keysActions, splitPick } from '../stage/splitPick.svelte'
  import { libraryPages, quickRacksBar } from './frameModel'
  import { followPendingEditor, instrumentsActions, instrumentsProps } from './instrumentsModel'
  import { instrumentsState } from './instrumentsState.svelte'
  import MapTab from './MapTab.svelte'
  import { libraryNav } from './nav.svelte'
  import { racksActions, racksProps } from './racksModel'
  import { racksState } from './racksState.svelte'
  import { presetsToList, soundsActions, soundsProps } from './soundsModel'
  import { soundsPage } from './soundsState.svelte'
  import { stylesActions, stylesOrigin, stylesProps } from './stylesModel'
  import { stylesState } from './stylesState.svelte'

  const WIDTH = 1440
  const HEIGHT = 900
  /** The app bar's CPU reading: a slow poll is enough here (the Stage reads meters at 30 Hz). */
  const METER_MS = 500

  const tipAction = tip as unknown as Action<HTMLElement, string>

  // ── Meters (the health slot's CPU) and the wall clock (the dropouts' 30-second window)
  let meters = $state.raw<Meters | null>(null)
  let nowMs = $state(Date.now())
  $effect(() => {
    let live = true
    const read = () => {
      nowMs = Date.now()
      app.meters().then((m) => live && (meters = m))
    }
    read()
    const t = setInterval(read, METER_MS)
    return () => {
      live = false
      clearInterval(t)
    }
  })

  // ── Opening: the Styles cursor on the loaded (or queued) style, the filter empty; leaving
  // stops a style preview.
  untrack(() => stylesState.reset(stylesOrigin(app.state)))
  $effect(() => {
    const id = stylesOrigin(app.state)
    untrack(() => stylesState.follow(id))
  })
  $effect(() => () => {
    if (untrack(() => app.state.preview?.audition)) app.send({ type: 'stopAudition' })
  })

  // ── Instruments › Browse on a plugin lists its presets once (as today's Sounds tab did).
  // Not reactive on purpose: only the effect below reads it, and a listing must not re-run it.
  // eslint-disable-next-line svelte/prefer-svelte-reactivity
  const listed = new Set<string>()
  $effect(() => {
    const id = presetsToList(app.state, app.sounds, libraryNav)
    if (id && !listed.has(id)) {
      listed.add(id)
      untrack(() => app.send({ type: 'listPluginPresets', id }))
    }
  })

  // ── + New sound on a plugin opens its window once the part has loaded it.
  $effect(() => {
    const s = app.state
    const part = ui.libraryPart
    untrack(() => followPendingEditor(s, part, instrumentsState, (p) => app.pluginEditor(p, true)))
  })

  // ── A rack prompt (a Quick Rack over unsaved changes, sound names) is asked in the Rack drawer,
  // which opens over Library (the old Library asked it in its docked Rack panel).
  let asked = false
  $effect(() => {
    const now = app.state.liveRack.prompt !== null
    if (now && !asked && !ui.rack) untrack(() => ui.toggleDrawer('rack'))
    asked = now
  })

  // ── Pages and links
  function show(page: LibraryTab) {
    ui.libraryTab = page
  }

  function open(target: OpenTarget) {
    if (typeof target === 'object' && 'page' in target) {
      if (target.page === 'library') return
      ui.view = 'stage'
      if (target.page === 'settings') {
        stagePage.page = 'stage'
        if (!ui.settings) ui.toggleDrawer('settings')
        return
      }
      ui.settings = false
      stagePage.page = target.page
      return
    }
    if (typeof target === 'object' && 'channel' in target) {
      ui.selectedPart = target.channel
      if (target.channel < 4) app.send({ type: 'selectPart', part: target.channel })
      ui.view = 'stage'
      stagePage.page = 'channel'
      return
    }
    if (typeof target === 'object' && 'sounds' in target) {
      ui.openLibrary('sounds', target.sounds)
      return
    }
    if (target === 'browser') show('styles')
    else if (target === 'settingsAudio') {
      settingsNav.tab = 'audio'
      ui.settings = true
    } else if (target === 'rack' && !ui.rack) ui.toggleDrawer('rack')
    else if (target === 'effects' && !ui.effects) ui.toggleDrawer('effects')
    else if (target === 'multipad' && !ui.multipad) ui.toggleDrawer('multipad')
  }

  const actions = stageActions({
    state: () => app.state,
    shift: () => ui.shift,
    send: (cmd) => app.send(cmd),
    open,
    toggleHelp: () => tips.toggleHelp(),
    tempo: () => {},
  })

  // ── Quick Racks: Clear is armed here (the engine clears one slot at a time).
  let clearArmed = $state(false)
  function quickSlot(i: number) {
    if (clearArmed) {
      clearArmed = false
      app.send({ type: 'clearQuickRack', bank: app.state.quickRacks.bank, slot: i })
      return
    }
    app.send({ type: 'pressQuickRack', slot: i })
  }

  // ── The pages' callbacks (built once; they read the stores when called)
  const send = (c: Parameters<typeof app.send>[0]) => app.send(c)
  const stylesCb = stylesActions({
    state: () => app.state,
    library: () => app.library,
    send,
    prefs,
    styles: stylesState,
    close: () => (ui.view = 'stage'),
    isOpen: () => ui.view === 'library' && ui.libraryTab === 'styles',
  })
  const soundsCb = soundsActions({
    state: () => app.state,
    catalog: () => app.sounds,
    part: () => ui.libraryPart,
    send,
    setPart: (i) => (ui.libraryPart = i),
    nav: libraryNav,
    page: soundsPage,
  })
  const instrumentsCb = instrumentsActions({
    state: () => app.state,
    catalog: () => app.sounds,
    send,
    part: () => ui.libraryPart,
    st: instrumentsState,
    browseSounds: (id) => {
      libraryNav.instrument = id
      libraryNav.source = 'all'
      libraryNav.favourites = false
      libraryNav.category = null
      libraryNav.query = ''
      show('sounds')
    },
    showRacks: () => {
      libraryNav.attention = true
      show('racks')
    },
    replaceOnPart: (p) => {
      ui.libraryPart = p
      show('sounds')
    },
    openEditor: (p) => app.pluginEditor(p, true),
  })
  const racksCb = racksActions({ state: () => app.state, send })

  // ── The props, each derived from only what it reads
  const s = $derived(app.state)
  const tab = $derived(ui.libraryTab)
  const appBarData = $derived(appBar({ state: s, meters, page: 'library', dropouts: dropouts.recent(nowMs) }))
  const pages = $derived(libraryPages(s, app.library, app.sounds))
  const quickRacks = $derived(quickRacksBar(s, clearArmed))
  const styles = $derived(tab === 'styles' ? { ...stylesProps(s, app.library, stylesState, prefs), ...stylesCb } : undefined)
  const sounds = $derived(tab === 'sounds' ? { ...soundsProps(s, app.sounds, ui.libraryPart, libraryNav, soundsPage), ...soundsCb } : undefined)
  const instruments = $derived(tab === 'instruments' ? { ...instrumentsProps(s, app.sounds, instrumentsState, ui.libraryPart), ...instrumentsCb } : undefined)
  const racks = $derived(tab === 'racks' ? { ...racksProps(s, libraryNav, racksState), ...racksCb } : undefined)
  const hint = useStatusHint()
  const statusData = $derived(status(s, hint.current))
  // The main keyboard sets the split, as on the Stage (../stage/splitPick.svelte.ts).
  const keyCb = keysActions({ state: () => app.state, send: (cmd) => app.send(cmd), arm: (on) => (splitPick.armed = on) })
  const keyData = $derived({ ...keys(s, rangeFor(ui.keyRange, s.io.inputs), splitPick.armed), tipAction, ...keyCb })

  // ── Scale to fit
  let box: HTMLDivElement
  let boxW = $state(WIDTH)
  let boxH = $state(HEIGHT)
  const scale = $derived(Math.max(0.1, Math.min(boxW / WIDTH, boxH / HEIGHT)))
  $effect(() => {
    const measure = () => {
      boxW = box.clientWidth || WIDTH
      boxH = box.clientHeight || HEIGHT
    }
    measure()
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure)
      return () => window.removeEventListener('resize', measure)
    }
    const observer = new ResizeObserver(measure)
    observer.observe(box)
    return () => observer.disconnect()
  })
</script>

{#snippet map()}<MapTab />{/snippet}

<div class="scaler" data-theme={ui.theme} bind:this={box}>
  <div class="artboard" style:transform={`translate(-50%, -50%) scale(${scale})`}>
    <Library
      appBar={appBarData}
      help={tips.help}
      {pages}
      page={tab}
      {quickRacks}
      {styles}
      {sounds}
      {instruments}
      {racks}
      {map}
      status={statusData}
      keys={keyData}
      {tipAction}
      onchoose={actions.onchoose}
      onhealth={actions.onhealth}
      onpanic={actions.onpanic}
      onhelp={actions.onhelp}
      onclear={() => app.send({ type: 'clearMessage' })}
      onpage={(id) => show(id as LibraryTab)}
      onquickbank={(delta) => app.send({ type: 'stepQuickRackBank', delta })}
      onquickstore={() => app.send({ type: 'toggleQuickRackStore' })}
      onquickclear={() => (clearArmed = !clearArmed)}
      onquickslot={quickSlot}
      onquickslotlong={(i) => app.send({ type: 'storeRack', slot: i })}
    />
  </div>
</div>

<style>
  .scaler {
    position: relative;
    flex: 1;
    min-width: 0;
    min-height: 0;
    overflow: hidden;
    background: var(--g);
    color: var(--t);
    font-family: var(--font-sans);
    font-variant-numeric: tabular-nums;
  }
  .artboard {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 1440px;
    height: 900px;
    transform-origin: center;
  }
</style>
