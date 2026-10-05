<!--
  StageScreen: the app's wiring of the library's Stage (app/src/ui/Stage). It reads the
  stores (app.state, app.library, the clocks, ui, tips), turns them into the Stage's region
  props (model.ts), and turns the Stage's callbacks into commands and links (actions.ts).
  The page tabs other than Stage show ComingSoon.

  Scaling (Stage.md D1): the Stage is laid out at 1440 × 900; this box fills what the shell
  gives it and scales the artboard uniformly to fit, centred, on the kit's ground. The kit's
  tokens apply under `data-theme` on this box (the old shell's tokens stay on :root).
-->
<script lang="ts">
  import type { Action } from 'svelte/action'
  import type { Meters } from '../../lib/api/types'
  import { dropouts } from '../../lib/dropouts.svelte'
  import { clock, app, ui } from '../../lib/store.svelte'
  import { TempoHold } from '../../lib/tempoHold'
  import { tip, tips } from '../../lib/tooltip/tip.svelte'
  import { rangeFor } from '../keystrip/keyboard'
  import { nav as settingsNav } from '../settings/nav.svelte'
  import Stage from '../../ui/Stage/Stage.svelte'
  import { stageActions, type OpenTarget } from './actions'
  import ComingSoon from './ComingSoon.svelte'
  import { appBar, beatOf, display, faders, holdPeak, keys, knobs, pads, sectionRow, status, stripMeters, transport, type HoldState } from './model'
  import { stagePage } from './page.svelte'

  const WIDTH = 1440
  const HEIGHT = 900
  /** How often the meters are read (about 30 Hz; Stage.md, the wiring's frame loop). */
  const METER_MS = 33

  const tipAction = tip as unknown as Action<HTMLElement, string>

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

  // ── Tempo − / + held
  const tempoHold = new TempoHold((cmd) => app.send(cmd))
  $effect(() => () => tempoHold.releaseAll())

  // ── Links (Stage.md D32): pages not built yet show "Coming soon"; the rest open today's drawers.
  function open(target: OpenTarget) {
    if (typeof target === 'object' && 'page' in target) {
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
    if (target === 'browser') ui.browser = true
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
    tempo: (dir, down) => tempoHold.set(dir, down),
  })

  // ── The regions, each derived from only what it reads (the clocks tick every frame).
  const s = $derived(app.state)
  const appBarData = $derived(appBar({ state: s, meters, page: stagePage.page, dropouts: dropouts.recent(nowMs) }))
  const sectionRowData = $derived(sectionRow({ state: s, help: tips.help }))
  const displayBase = $derived(display({ state: s, library: app.library, pos: 0 }))
  const displayData = $derived({ ...displayBase, nowPlaying: { ...displayBase.nowPlaying, ...beatOf(s, clock.pos) } })
  const faderData = $derived(faders({ state: s, meters, holds }))
  const knobData = $derived(knobs({ state: s }))
  const padBase = $derived(pads({ state: s, beats: 0 }))
  const lit = $derived(clock.beats - Math.floor(clock.beats) < 0.5)
  const padData = $derived({ ...padBase, lit })
  const transportData = $derived(transport(s))
  const statusData = $derived(status(s))
  const keyData = $derived(keys(s, rangeFor(ui.keyRange, s.io.inputs)))

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
    {#if stagePage.page === 'stage'}
      <Stage
        appBar={appBarData}
        sectionRow={sectionRowData}
        display={displayData}
        faders={faderData}
        knobs={knobData}
        pads={padData}
        transport={transportData}
        status={statusData}
        keys={keyData}
        {tipAction}
        {...actions}
      />
    {:else}
      <ComingSoon appBar={appBarData} {tipAction} onchoose={actions.onchoose} onhealth={actions.onhealth} />
    {/if}
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
