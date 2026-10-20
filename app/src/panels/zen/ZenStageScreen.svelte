<!--
  ZenStageScreen: the app's Stage, drawn by zen's Svelte Stage (`@satoramoto/zen/svelte`). It reads
  the stores (app.state, app.library, the clocks, ui, tips), turns them into zen's Stage props with
  lib/zen/stage.ts, and its callbacks into commands and links (the same actions as the former
  Stage, panels/stage/actions.ts). The former Stage (panels/stage/StageScreen) stays reachable
  with `?legacy` (`ui.legacyStage`) for one release.

  A display page tab (Channel, Effects, Quick Racks, Multi Pads, Looper, Harm/Arp, PAGE_COMPONENTS)
  shows through the Stage's `page` slot, in the Display's place; the side panel (first run, the
  help card, the swap panel) through its `side` slot, in the hero's right third. The blooms
  (ui/Blooms) breathe behind it: the Stage stands on `backdrop="transparent"`. The layout is
  `split` (the hero across the top), the one zen's page slot is laid out for, as the former
  Stage's display was.
-->
<script lang="ts">
  import type { Component } from 'svelte'
  import type { Action } from 'svelte/action'
  import { packs } from '@satoramoto/zen/themes'
  import { Stage, ThemeScope, type StageTipAction } from '@satoramoto/zen/svelte'
  import '@satoramoto/zen/zen.css'
  import type { Meters } from '../../lib/api/types'
  import { dropouts } from '../../lib/dropouts.svelte'
  import { app, clock, ui, PART_IDS } from '../../lib/store.svelte'
  import { TempoHold } from '../../lib/tempoHold'
  import { helpCard } from '../../lib/tooltip/helpCard.svelte'
  import { tip, tips } from '../../lib/tooltip/tip.svelte'
  import { stageHandlers, stageProps } from '../../lib/zen/stage'
  import Blooms from '../../ui/Blooms/Blooms.svelte'
  import { levelOf } from '../../ui/Blooms/blooms'
  import HelpCard from '../../ui/HelpCard/HelpCard.svelte'
  import SwapPanel from '../../ui/SwapPanel/SwapPanel.svelte'
  import { swapPanel } from '../../ui/SwapPanel/swap'
  import ChannelPage from '../channel/ChannelPage.svelte'
  import EffectsPage from '../effects/EffectsPage.svelte'
  import FirstRunPanel from '../firstrun/FirstRunPanel.svelte'
  import HarmArpPage from '../harmony/HarmArpPage.svelte'
  import { rangeFor } from '../keystrip/keyboard'
  import LooperPage from '../looper/LooperPage.svelte'
  import MultiPadsPage from '../multipad/MultiPadsPage.svelte'
  import QuickRacksPage from '../quickracks/QuickRacksPage.svelte'
  import { openRackDrawerOnPrompt } from '../quickracks/rackPromptDrawer.svelte'
  import { nav as settingsNav } from '../settings/nav.svelte'
  import type { OpenTarget } from '../stage/actions'
  import { useStatusHint } from '../stage/hint.svelte'
  import { display, holdPeak, stripMeters, type HoldState } from '../stage/model'
  import { stagePage, type PageProps } from '../stage/page.svelte'
  import { splitPick } from '../stage/splitPick.svelte'

  /** How often the meters are read (about 30 Hz, as the former Stage did). */
  const METER_MS = 33

  const pack = packs.find((p) => p.id === 'yahaha-push')!
  const tipAction = tip as unknown as StageTipAction
  const pageTip = tip as unknown as Action<HTMLElement, string>

  /** The display pages, by page tab id (panels/stage/model.ts DISPLAY_TABS), in the Stage's `page` slot. */
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

  // ── A rack prompt opens the Rack drawer, where it is asked (as on the former Stage).
  openRackDrawerOnPrompt()

  // ── Tempo − / + held
  const tempoHold = new TempoHold((cmd) => app.send(cmd))
  $effect(() => () => tempoHold.releaseAll())

  let metronomeOpen = $state(false)
  let root: HTMLDivElement

  // ── Links: a page tab shows its page; the rest open today's drawers and screens (as the former Stage).
  function open(target: OpenTarget) {
    if (typeof target === 'object' && 'page' in target) {
      if (target.page === 'settings') {
        if (!ui.settings) ui.toggleDrawer('settings')
        return
      }
      ui.settings = false
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
      // The part's quick sound list (panels/sounds/SoundPick), under the control that asked.
      const el = document.activeElement
      const anchor = el instanceof HTMLElement && root?.contains(el) ? el.getBoundingClientRect() : null
      ui.soundList = { part: PART_IDS[Math.max(0, Math.min(3, target.sounds))], anchor }
      return
    }
    if (target === 'browser') ui.openLibrary('styles')
    else if (target === 'settingsAudio') {
      settingsNav.tab = 'audio'
      ui.settings = true
    } else if (target === 'rack' && !ui.rack) ui.toggleDrawer('rack')
  }

  const on = stageHandlers((cmd) => app.send(cmd), {
    state: () => app.state,
    open,
    help: (h) => (tips.help = h),
    tempo: (dir, down) => tempoHold.set(dir, down),
    metronomeSettings: () => (metronomeOpen = !metronomeOpen),
    metronomeClose: () => (metronomeOpen = false),
    shift: () => ui.shift,
    arm: (armed) => (splitPick.armed = armed),
  })

  const s = $derived(app.state)
  // While the Settings drawer is open, its tab is the current one.
  const page = $derived(ui.settings ? 'settings' : stagePage.page)
  const PageComponent = $derived(PAGE_COMPONENTS[stagePage.page])
  /** The display's side panel, first match wins: first run, help mode, the swap layer held; else none. */
  const sideKind = $derived.by((): 'firstRun' | 'help' | 'swap' | null => {
    if (!ui.firstRunDone && !s.transport.running) return 'firstRun'
    if (tips.help) return 'help'
    if (s.surface.layer.type === 'swap') return 'swap'
    return null
  })
  // First run ends the first time the band starts; the panel's own "Choose a style" ends it too.
  $effect(() => {
    if (s.transport.running && !ui.firstRunDone) ui.setFirstRunDone(true)
  })

  // The hovered or focused control's tooltip takes the status line's place.
  const hint = useStatusHint()

  const props = $derived(
    stageProps(s, {
      library: app.library,
      meters,
      holds,
      page,
      help: tips.help,
      keyRange: rangeFor(ui.keyRange, s.io.inputs),
      dropouts: dropouts.recent(nowMs),
      beats: clock.beats,
      pos: clock.pos,
      metronomeOpen,
      hint: hint.current,
      picking: splitPick.armed,
      shift: ui.shift,
    }),
  )
  /** The bloom's section hue, from the former Stage's display model. */
  const section = $derived(display({ state: s, library: app.library, pos: 0 }).nowPlaying.hue)

  // The page's box, for the pages laid out to `--page-width` × `--page-height`.
  let pageWidth = $state(0)
  let pageHeight = $state(0)
  /** Measures the page slot's box (jsdom, the tests, has no ResizeObserver: the pages' defaults apply). */
  const measure: Action<HTMLElement> = (el) => {
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => {
      pageWidth = el.clientWidth
      pageHeight = el.clientHeight
    })
    observer.observe(el)
    return { destroy: () => observer.disconnect() }
  }
</script>

<!-- The UI library's tokens (the blooms', the pages') apply under `data-theme` on this box, as on the former Stage. -->
<div class="zen-stage" data-theme={ui.theme} bind:this={root}>
  <Blooms
    playing={s.transport.running}
    bpm={s.transport.tempo}
    beatsPerBar={s.transport.beatsPerBar}
    level={levelOf(meters?.masterRms)}
    {section}
    beat={() => clock.pos}
  />
  <ThemeScope facets={pack.facets} principles={pack.principles} mode={ui.resolvedTheme} bleed>
    <Stage
      {tipAction}
      layout="split"
      backdrop="transparent"
      appBar={{ ...props.appBar, ...on.appBar }}
      display={{ ...props.display, ...on.display }}
      songForm={{ ...props.songForm, ...on.songForm }}
      faders={{ ...props.faders, ...on.faders }}
      knobs={{ ...props.knobs, ...on.knobs }}
      pads={{ ...props.pads, ...on.pads }}
      keys={{ ...props.keys, ...on.keys }}
      status={{ ...props.status, ...on.status }}
      page={PageComponent ? pageSlot : undefined}
      side={sideKind ? sideSlot : undefined}
    />
  </ThemeScope>
</div>

{#snippet pageSlot()}
  <div
    class="page"
    data-slot="page"
    use:measure
    style:--page-width={pageWidth ? `${pageWidth}px` : undefined}
    style:--page-height={pageHeight ? `${pageHeight}px` : undefined}
  >
    {#if PageComponent}<PageComponent tipAction={pageTip} />{/if}
  </div>
{/snippet}

{#snippet sideSlot()}
  <div class="side" data-slot="side">
    {#if sideKind === 'firstRun'}
      <FirstRunPanel tipAction={pageTip} />
    {:else if sideKind === 'help'}
      <HelpCard {...helpCard()} tipAction={pageTip} />
    {:else if sideKind === 'swap'}
      <SwapPanel data={swapPanel(s)} tipAction={pageTip} onrelease={() => app.send({ type: 'setLayer', layer: { type: 'none' } })} />
    {/if}
  </div>
{/snippet}

<style>
  .zen-stage {
    position: relative;
    flex: 1;
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--g);
    /* Its own stacking context: the blooms (z-index -1) paint over this ground, under the Stage. */
    isolation: isolate;
  }
  /* The theme scope paints the ground too, and has no transparent option: the Stage's own ground
     is off (`backdrop="transparent"`), so the scope's is the one rule left between it and the blooms. */
  .zen-stage :global(.lib-scope) {
    position: relative;
    background: transparent;
  }
  /* A page or the side panel, filling its slot; in the UI library's tokens (`data-theme` above). */
  .page,
  .side {
    box-sizing: border-box;
    min-width: 0;
    min-height: 0;
    overflow: hidden;
    color: var(--t);
    font-family: var(--font-sans);
  }
  .page {
    display: flex;
    flex-direction: column;
  }
</style>
