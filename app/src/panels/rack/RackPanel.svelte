<!--
  RackPanel: the app's wiring of the Rack page (ui/Rack, docs/design/push/Rack-Dark.dc.html), in
  the main slot while `ui.view === 'rack'` (the app bar's rack readout, Alt+O). A tall page: the
  Stage's frame (app bar, section row, status line, keys) with the Rack in the display's place,
  grown to 468px, and the band at half height under it, so nothing covers Start / Stop.

  It reads the stores, turns them into the page's props (model.ts), and turns its callbacks into
  commands. "Edit map" opens the controller map editor (ui/RackMapEditor; Rack-MapEdit board) in
  the parts table's place; a pick sends `setRackControl`, "Default map" sends the default targets
  with `setRackControl` (no single reset command exists). The rack prompts (`liveRack.prompt`)
  are asked by PromptHost, not here.

  Scaling as StageScreen: laid out at 1440 × 900, scaled uniformly to fit, centred, under
  `data-theme`. `docked` is kept for App.svelte; the page is always docked now.
-->
<script lang="ts">
  import type { Action } from 'svelte/action'
  import type { Meters } from '../../lib/api/types'
  import { dropouts } from '../../lib/dropouts.svelte'
  import { app, clock, ui, PART_IDS } from '../../lib/store.svelte'
  import { TempoHold } from '../../lib/tempoHold'
  import { tip, tips } from '../../lib/tooltip/tip.svelte'
  import Blooms from '../../ui/Blooms/Blooms.svelte'
  import { levelOf } from '../../ui/Blooms/blooms'
  import Rack from '../../ui/Rack/Rack.svelte'
  import RackMapEditor from '../../ui/RackMapEditor/RackMapEditor.svelte'
  import Stage from '../../ui/Stage/Stage.svelte'
  import { rangeFor } from '../keystrip/keyboard'
  import { nav as settingsNav } from '../settings/nav.svelte'
  import { stageActions, type OpenTarget } from '../stage/actions'
  import { useStatusHint } from '../stage/hint.svelte'
  import { appBar, display, faders, keys, knobs, pads, sectionRow, status } from '../stage/model'
  import { stagePage } from '../stage/page.svelte'
  import { keysActions, splitPick } from '../stage/splitPick.svelte'
  import {
    defaultMapCommands,
    mapRows,
    pickerOptions,
    rackHands,
    rackHead,
    rackKeyboard,
    rackMapSummary,
    rackNow,
    rackOneTouch,
    rackSends,
    targetsByKey,
  } from './model'
  import { MAX_SENDS } from './strip'

  // Kept so App.svelte mounts it unchanged; the Rack is a page now, always docked.
  let { docked = true }: { docked?: boolean } = $props()

  const WIDTH = 1440
  const HEIGHT = 900
  const METER_MS = 100

  const tipAction = tip as unknown as Action<HTMLElement, string>

  // ── Meters (the faders and the app bar's CPU) and the wall clock (the dropouts' window)
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

  const tempoHold = new TempoHold((cmd) => app.send(cmd))
  $effect(() => () => tempoHold.releaseAll())

  let artboard: HTMLDivElement

  /** Show a display page on the Stage (leaving the Rack). */
  function showPage(id: string) {
    stagePage.show(id)
  }

  // ── Links: a page tab leaves the Rack for it; the rest as on the Stage.
  function open(target: OpenTarget) {
    if (typeof target === 'object' && 'page' in target) {
      if (target.page === 'settings') {
        ui.settings = true
        return
      }
      if (target.page === 'library') {
        ui.openLibrary()
        return
      }
      showPage(target.page)
      return
    }
    if (typeof target === 'object' && 'channel' in target) return openChannel(target.channel)
    if (typeof target === 'object' && 'sounds' in target) return openSounds(target.sounds)
    if (target === 'browser') ui.openLibrary('styles')
    else if (target === 'settingsAudio') {
      settingsNav.tab = 'audio'
      ui.settings = true
    } else if (target === 'rack') ui.view = 'stage'
  }

  function openChannel(part: number) {
    ui.selectedPart = part
    if (part < 4) app.send({ type: 'selectPart', part })
    showPage('channel')
  }

  /** The part's quick sound list, under the control that asked. */
  function openSounds(part: number) {
    const el = document.activeElement
    const anchor = el instanceof HTMLElement && artboard?.contains(el) ? el.getBoundingClientRect() : null
    ui.soundList = { part: PART_IDS[Math.max(0, Math.min(3, part))], anchor }
  }

  const actions = stageActions({
    state: () => app.state,
    shift: () => ui.shift,
    send: (cmd) => app.send(cmd),
    open,
    toggleHelp: () => tips.toggleHelp(),
    tempo: (dir, down) => tempoHold.set(dir, down),
  })

  // ── The controller map editor
  let mapOpen = $state(false)
  function pick(control: 'fader' | 'knob', index: number, key: string) {
    const target = targetsByKey(app.state).get(key)
    if (target) app.send({ type: 'setRackControl', control, index, target })
  }
  function defaultMap() {
    for (const c of defaultMapCommands(app.state)) app.send({ type: 'setRackControl', ...c })
  }

  // ── The regions
  const s = $derived(app.state)
  const appBarData = $derived(appBar({ state: s, meters, page: 'rack', dropouts: dropouts.recent(nowMs) }))
  const sectionRowData = $derived(sectionRow({ state: s, help: tips.help }))
  const displayData = $derived(display({ state: s, library: app.library, pos: 0 }))
  const faderData = $derived(faders({ state: s, meters, holds: [] }))
  const knobData = $derived(knobs({ state: s }))
  const padBase = $derived(pads({ state: s, beats: 0 }))
  const lit = $derived(clock.beats - Math.floor(clock.beats) < 0.5)
  const padData = $derived({ ...padBase, lit })
  const hint = useStatusHint()
  const statusData = $derived(status(s, hint.current))
  const keyCb = keysActions({ state: () => app.state, send: (cmd) => app.send(cmd), arm: (on) => (splitPick.armed = on) })
  const keyData = $derived({ ...keys(s, rangeFor(ui.keyRange, s.io.inputs), splitPick.armed), tipAction, ...keyCb })

  const now = $derived(rackNow(s, app.library))
  const keyboard = $derived(rackKeyboard(s))
  const head = $derived(rackHead(s))
  const hands = $derived(rackHands(s))
  const mapSummary = $derived(rackMapSummary(s))
  const rows = $derived(mapOpen ? mapRows(s) : null)
  const picker = $derived(mapOpen ? pickerOptions(s) : null)
  const sends = $derived(rackSends(s))
  const oneTouch = $derived(rackOneTouch(s))

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

  const send = (c: Parameters<typeof app.send>[0]) => app.send(c)
</script>

<div class="scaler" class:docked data-theme={ui.resolvedTheme} bind:this={box}>
  <div class="artboard tall" style:transform={`translate(-50%, -50%) scale(${scale})`} bind:this={artboard}>
    <Blooms
      playing={s.transport.running}
      bpm={s.transport.tempo}
      beatsPerBar={s.transport.beatsPerBar}
      level={levelOf(meters?.masterRms)}
      section={displayData.nowPlaying.hue}
      beat={() => clock.pos}
    />
    <Stage
      appBar={appBarData}
      sectionRow={sectionRowData}
      display={displayData}
      page={rackPage}
      faders={faderData}
      knobs={knobData}
      pads={padData}
      status={statusData}
      keys={keyData}
      {tipAction}
      {...actions}
    />
    {#snippet rackPage()}
      <Rack
        {now}
        {keyboard}
        {head}
        {hands}
        map={mapSummary}
        {mapOpen}
        editor={rows && picker ? mapEditor : undefined}
        {sends}
        canAddSend={sends.length < MAX_SENDS}
        {oneTouch}
        {tipAction}
        onsplit={(delta) => send({ type: 'moveSplit', delta })}
        ontranspose={(delta) => send({ type: 'stepTranspose', keyboard: delta, master: 0 })}
        onharmony={(on) => send({ type: 'setHarmonyArpOn', on })}
        onharmonytype={() => showPage('harmArp')}
        onmanualbass={() => send({ type: 'toggleManualBass' })}
        onlefthold={() => send({ type: 'toggleLeftHold' })}
        onstore={() => send({ type: 'toggleQuickRackStore' })}
        onrevert={() => send({ type: 'revertRack' })}
        onsave={() => send({ type: 'saveRack' })}
        onsaveas={(name) => send({ type: 'saveRackAs', name })}
        onsound={openSounds}
        onpart={(i, on) => actions.onlamp?.(PART_IDS[i], on)}
        onpartlong={(i) => actions.onlamplong?.(PART_IDS[i])}
        onpartrelease={(i) => actions.onlamprelease?.(PART_IDS[i])}
        onlevel={(part, volume) => send({ type: 'setPartVolume', part, volume })}
        onpan={(part, pan) => send({ type: 'setPartPan', part, pan })}
        onsend={(part, n, value) =>
          n === 2
            ? send({ type: 'setStripSend', strip: part, send: 2, level: value })
            : send({ type: 'setPartSend', part, send: n === 0 ? 'reverb' : 'chorus', value })}
        onoctave={(part, octave) => send({ type: 'setPartOctave', part, octave })}
        onchannel={openChannel}
        onedit={(part) => app.pluginEditor(part, true)}
        onreload={(part) => send({ type: 'reloadPartPlugin', part })}
        onsavesound={(part) => send({ type: 'saveSound', part })}
        oninprocess={(part) => {
          const id = s.keyboardParts[part]?.plugin?.id
          const entry = id ? s.plugins.list.find((x) => x.id === id) : undefined
          if (entry?.canRunInProcess) send({ type: 'setPluginInProcess', id: entry.id, inProcess: !entry.inProcess })
        }}
        onreplace={(part) => ui.openLibrary('sounds', part)}
        onmap={(on) => (mapOpen = on)}
        ondefaultmap={defaultMap}
        onaddsend={() => send({ type: 'addSend', kind: 'hall' })}
        onremovesend={(n) => send({ type: 'removeSend', send: n })}
        onkeeptype={(n, on) => send({ type: 'setRackSendOverride', send: n, on })}
        onots={(index) => send({ type: 'recallOts', index })}
        onlink={(on) => send({ type: 'setOtsLink', on })}
        ontiming={(timing) => send({ type: 'setOtsLinkTiming', timing })}
        onchangeots={() => showPage('quickRacks')}
      />
    {/snippet}
    {#snippet mapEditor()}
      {#if rows && picker}
        <RackMapEditor faders={rows.faders} knobs={rows.knobs} rack={picker.rack} parts={picker.parts} {tipAction} onpick={pick} />
      {/if}
    {/snippet}
  </div>
</div>

<style>
  .scaler {
    position: relative;
    flex: 1;
    min-width: 0;
    min-height: 0;
    /* clip, not hidden: focusing a control near the edge must not scroll the artboard. */
    overflow: clip;
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
    --backdrop-ground: transparent;
  }
  /* The tall page (Rack board, H1): the display's box grows to 468 and the band goes half
     height, 176, under a 20px gap; its faders, knobs and pads shrink to fit, clipped. */
  .tall :global(.screen.grid) {
    --display-height: 468px;
    --band-height: 176px;
    --stage-gap-display: 12px;
    --stage-gap-band: 20px;
    --pad-size: 28px;
  }
  .tall :global(.screen.grid .band) {
    overflow: hidden;
  }
</style>
