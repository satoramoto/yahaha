<!--
  StageScreen: the app's wiring of the library's Stage (app/src/ui/Stage). It reads the
  stores (app.state, app.library, the clocks, ui, tips), turns them into the Stage's region
  props (model.ts), and turns the Stage's callbacks into commands and links (actions.ts).
  A display page tab (Channel, Effects, Quick Racks, Multi Pads, Looper, Harm/Arp) shows the
  Stage with that page (PAGE_COMPONENTS, each `PageProps`) in its display box; Settings opens the
  Settings screen and Library the Library screen (App.svelte). The status line shows the hovered or focused control's tooltip (hint.svelte.ts).

  Scaling (Stage.md D1): the Stage is laid out at 1440 × 900; this box fills what the shell
  gives it and scales the artboard uniformly to fit, centred, on the kit's ground. The kit's
  tokens apply under `data-theme` on this box (the old shell's tokens stay on :root).
-->
<script lang="ts">
  import type { Component } from 'svelte'
  import type { Action } from 'svelte/action'
  import type { Meters } from '../../lib/api/types'
  import { dropouts } from '../../lib/dropouts.svelte'
  import { clock, app, ui } from '../../lib/store.svelte'
  import { TempoHold } from '../../lib/tempoHold'
  import { tip, tips } from '../../lib/tooltip/tip.svelte'
  import { rangeFor } from '../keystrip/keyboard'
  import { openRackDrawerOnPrompt } from '../quickracks/rackPromptDrawer.svelte'
  import { nav as settingsNav } from '../settings/nav.svelte'
  import Stage from '../../ui/Stage/Stage.svelte'
  import ChannelPage from '../channel/ChannelPage.svelte'
  import EffectsPage from '../effects/EffectsPage.svelte'
  import HarmArpPage from '../harmony/HarmArpPage.svelte'
  import LooperPage from '../looper/LooperPage.svelte'
  import MultiPadsPage from '../multipad/MultiPadsPage.svelte'
  import QuickRacksPage from '../quickracks/QuickRacksPage.svelte'
  import { stageActions, type OpenTarget } from './actions'
  import { useStatusHint } from './hint.svelte'
  import { appBar, beatOf, display, faders, holdPeak, keys, knobs, pads, sectionRow, status, stripMeters, type HoldState } from './model'
  import { stagePage, type PageProps } from './page.svelte'
  import { keysActions, splitPick } from './splitPick.svelte'

  const WIDTH = 1440
  const HEIGHT = 900
  /** How often the meters are read (about 30 Hz; Stage.md, the wiring's frame loop). */
  const METER_MS = 33

  const tipAction = tip as unknown as Action<HTMLElement, string>

  /** The display pages, by page tab id (model.ts DISPLAY_TABS): each shows in the Stage's display box. */
  const PAGE_COMPONENTS: Partial<Record<string, Component<PageProps>>> = {
    channel: ChannelPage,
    effects: EffectsPage,
    quickRacks: QuickRacksPage,
    multiPads: MultiPadsPage,
    looper: LooperPage,
    harmArp: HarmArpPage,
  }

  // ── Meters and held peaks
  let meters = $state.raw<Meters | null>(null)
  let holds = $state.raw<number[]>([])
  let holdStates: (HoldState | undefined)[] = []
  $effect(() => {
    let live = true
    const read = () =>
      app.meters().then((m) => {
        if (!live) return
        meters = m
        if (!m) return
        holdStates = stripMeters(app.state, m).map((x, i) => holdPeak(holdStates[i], x.peak, m.atMs))
        holds = holdStates.map((h) => h?.peak ?? 0)
      })
    read()
    const t = setInterval(read, METER_MS)
    return () => {
      live = false
      clearInterval(t)
    }
  })

  // ── The wall clock, for the dropouts' 30-second window
  let nowMs = $state(Date.now())
  $effect(() => {
    const t = setInterval(() => (nowMs = Date.now()), 1000)
    return () => clearInterval(t)
  })

  // ── A rack prompt (unsaved changes, sound names: an OTS, a Quick Rack from the Launchkey)
  // opens the Rack drawer, where it is asked, as the old Quick Racks row did.
  openRackDrawerOnPrompt()

  // ── Tempo − / + held
  const tempoHold = new TempoHold((cmd) => app.send(cmd))
  $effect(() => () => tempoHold.releaseAll())

  // ── Links (Stage.md D32): a page tab shows its page; the rest open today's drawers and screens.
  function open(target: OpenTarget) {
    if (typeof target === 'object' && 'page' in target) {
      // Settings isn't a page of its own yet: its tab opens today's Settings drawer, the
      // same one Alt+T opens, over the Stage. Any other tab puts the drawer away.
      if (target.page === 'settings') {
        if (!ui.settings) ui.toggleDrawer('settings')
        return
      }
      ui.settings = false
      // Library is a page of its own (panels/library/LibraryScreen, in the Stage's place).
      if (target.page === 'library') {
        ui.openLibrary()
        return
      }
      stagePage.page = target.page
      return
    }
    if (typeof target === 'object' && 'channel' in target) {
      ui.selectedPart = target.channel
      if (target.channel < 4) app.send({ type: 'selectPart', part: target.channel })
      stagePage.page = 'channel'
      return
    }
    if (typeof target === 'object' && 'sounds' in target) {
      ui.openLibrary('sounds', target.sounds)
      return
    }
    if (target === 'browser') ui.openLibrary('styles')
    else if (target === 'settingsAudio') {
      settingsNav.tab = 'audio'
      ui.settings = true
    } else if (target === 'rack' && !ui.rack) ui.toggleDrawer('rack')
  }

  const actions = stageActions({
    state: () => app.state,
    shift: () => ui.shift,
    send: (cmd) => app.send(cmd),
    open,
    toggleHelp: () => tips.toggleHelp(),
    tempo: (dir, down) => tempoHold.set(dir, down),
  })

  // ── The regions, each derived from only what it reads (the clocks tick every frame).
  const s = $derived(app.state)
  // While the Settings drawer is open, its tab is the current one.
  const page = $derived(ui.settings ? 'settings' : stagePage.page)
  /** The display page in the Stage's display box; none on the Stage itself. */
  const PageComponent = $derived(PAGE_COMPONENTS[stagePage.page])
  const appBarData = $derived(appBar({ state: s, meters, page, dropouts: dropouts.recent(nowMs) }))
  const sectionRowData = $derived(sectionRow({ state: s, help: tips.help }))
  const displayBase = $derived(display({ state: s, library: app.library, pos: 0 }))
  const displayData = $derived({ ...displayBase, nowPlaying: { ...displayBase.nowPlaying, ...beatOf(s, clock.pos) } })
  const faderData = $derived(faders({ state: s, meters, holds }))
  const knobData = $derived(knobs({ state: s }))
  const padBase = $derived(pads({ state: s, beats: 0 }))
  const lit = $derived(clock.beats - Math.floor(clock.beats) < 0.5)
  const padData = $derived({ ...padBase, lit })
  // The hovered or focused control's tooltip takes the status line's place (hint.svelte.ts).
  const hint = useStatusHint()
  const statusData = $derived(status(s, hint.current))
  // The main keyboard sets the split: drag its line, or arm a pick and click a key (splitPick.svelte.ts).
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
    // jsdom (the tests) has no ResizeObserver: the window's size will do there.
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure)
      return () => window.removeEventListener('resize', measure)
    }
    const observer = new ResizeObserver(measure)
    observer.observe(box)
    return () => observer.disconnect()
  })
</script>

<div class="scaler" data-theme={ui.theme} bind:this={box}>
  <div class="artboard" style:transform={`translate(-50%, -50%) scale(${scale})`}>
    <Stage
      appBar={appBarData}
      sectionRow={sectionRowData}
      display={displayData}
      page={PageComponent ? pageSlot : undefined}
      faders={faderData}
      knobs={knobData}
      pads={padData}
      status={statusData}
      keys={keyData}
      {tipAction}
      {...actions}
    />
    {#snippet pageSlot()}
      {#if PageComponent}<PageComponent {tipAction} />{/if}
    {/snippet}
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
