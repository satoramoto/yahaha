<!--
  SettingsScreen: the app's wiring of the library's Settings screen (app/src/ui/Settings). Like
  StageScreen, it reads the stores, builds the screen's props (the app bar, section row, status
  line and keys from ../stage/model.ts, the pages from model.ts) and turns its callbacks into
  commands and links (../stage/actions.ts for the shared regions, actions.ts for the pages).
  App.svelte shows it while `ui.settings` is on (the Settings tab, Alt+T).

  Scaling (Stage.md D1): laid out at 1440 × 900, scaled uniformly to fit, centred, on the kit's
  ground, with the kit's tokens under `data-theme` on this box.
-->
<script lang="ts">
  import type { Action } from 'svelte/action'
  import { settings } from '../../lib/api/settings.svelte'
  import type { Meters } from '../../lib/api/types'
  import { dropouts } from '../../lib/dropouts.svelte'
  import { app, ui } from '../../lib/store.svelte'
  import { TempoHold } from '../../lib/tempoHold'
  import { tip, tips } from '../../lib/tooltip/tip.svelte'
  import { rangeFor } from '../keystrip/keyboard'
  import { openRackDrawerOnPrompt } from '../quickracks/rackPromptDrawer.svelte'
  import { stageActions, type OpenTarget } from '../stage/actions'
  import { useStatusHint } from '../stage/hint.svelte'
  import { appBar, keys, status } from '../stage/model'
  import { stagePage } from '../stage/page.svelte'
  import { keysActions, splitPick } from '../stage/splitPick.svelte'
  import Settings from '../../ui/Settings/Settings.svelte'
  import type { SettingsPageId } from '../../ui/Settings/types'
  import { settingsActions } from './actions'
  import { chordPage, keyboardPage, launchkeyPage, pedalsPage, SETTINGS_PAGES, stylePage, systemPage } from './model'
  import { nav } from './nav.svelte'

  const WIDTH = 1440
  const HEIGHT = 900
  /** How often the meters are read: the app bar's health and System's CPU only (about 1 Hz). */
  const METER_MS = 1000

  const tipAction = tip as unknown as Action<HTMLElement, string>

  // ── Meters, for the CPU load
  let meters = $state.raw<Meters | null>(null)
  $effect(() => {
    let live = true
    const read = () =>
      app.meters().then((m) => {
        if (live) meters = m
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

  // ── A rack prompt opens the Rack drawer, where it is asked (as on the Stage).
  openRackDrawerOnPrompt()

  // ── Tempo − / + held
  const tempoHold = new TempoHold((cmd) => app.send(cmd))
  $effect(() => () => tempoHold.releaseAll())

  // ── Links: another page tab leaves Settings for it; the rest as on the Stage.
  function open(target: OpenTarget) {
    if (typeof target === 'object' && 'page' in target) {
      if (target.page === 'settings') return
      ui.settings = false
      stagePage.page = target.page
      return
    }
    if (typeof target === 'object' && 'channel' in target) {
      ui.settings = false
      ui.selectedPart = target.channel
      if (target.channel < 4) app.send({ type: 'selectPart', part: target.channel })
      stagePage.page = 'channel'
      return
    }
    if (typeof target === 'object' && 'sounds' in target) {
      ui.settings = false
      ui.openLibrary('sounds', target.sounds)
      return
    }
    if (target === 'browser') ui.browser = true
    else if (target === 'settingsAudio') nav.page = 'system'
    else if (target === 'rack' && !ui.rack) ui.toggleDrawer('rack')
  }

  const stage = stageActions({
    state: () => app.state,
    shift: () => ui.shift,
    send: (cmd) => app.send(cmd),
    open,
    toggleHelp: () => tips.toggleHelp(),
    tempo: (dir, down) => tempoHold.set(dir, down),
  })

  const pages = settingsActions({
    state: () => app.state,
    send: (cmd) => app.send(cmd),
    settingsSend: (cmd) => settings.send(cmd),
    setTheme: (theme) => ui.setTheme(theme),
    openPage: (page) => (nav.page = page),
    arm: (armed) => (splitPick.armed = armed),
  })

  // ── The main keyboard sets the split, as on the Stage (../stage/splitPick.svelte.ts).
  const keyCb = keysActions({ state: () => app.state, send: (cmd) => app.send(cmd), arm: (on) => (splitPick.armed = on) })

  // ── The regions
  const s = $derived(app.state)
  const range = $derived(rangeFor(ui.keyRange, s.io.inputs))
  const cpu = $derived(meters && meters.channels.length > 0 ? meters.cpu.total : null)
  const recentDropouts = $derived(dropouts.recent(nowMs))
  const appBarData = $derived(appBar({ state: s, meters, page: 'settings', dropouts: recentDropouts }))
  const hint = useStatusHint()
  const statusData = $derived(status(s, hint.current))
  const keyData = $derived({ ...keys(s, range, splitPick.armed), tipAction, ...keyCb })

  const chord = $derived(chordPage(s, splitPick.armed))
  const style = $derived(stylePage(s))
  const keyboard = $derived(keyboardPage(s))
  const pedals = $derived(pedalsPage(s))
  const system = $derived(systemPage(s, { theme: ui.theme, cpu, dropouts: recentDropouts }))
  const launchkey = $derived(launchkeyPage(s))

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
    <Settings
      appBar={appBarData}
      help={tips.help}
      status={statusData}
      keys={keyData}
      pages={SETTINGS_PAGES}
      page={nav.page}
      {chord}
      {style}
      {keyboard}
      {pedals}
      {system}
      {launchkey}
      {tipAction}
      onchoose={stage.onchoose}
      onhealth={stage.onhealth}
      onpanic={stage.onpanic}
      onhelp={stage.onhelp}
      onclear={stage.onclear}
      onpage={(id: SettingsPageId) => (nav.page = id)}
      {...pages}
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
