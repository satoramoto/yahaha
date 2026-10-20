<!--
  ZenStageScreen: the pilot of zen's Svelte Stage (`@satoramoto/zen/svelte`) in the app, shown
  while `ui.view` is 'zen' (the `?zen` URL parameter). It reads the same stores as StageScreen,
  turns them into zen's Stage props with lib/zen/stage.ts, and its callbacks into the same
  commands. The app's own Stage (panels/stage/StageScreen) stays the default; any link that leaves
  the Stage (a page tab, Channel, a sound list, Library) goes back to it.
-->
<script lang="ts">
  import { packs } from '@satoramoto/zen'
  import { Stage, ThemeScope, type StageTipAction } from '@satoramoto/zen/svelte'
  import '@satoramoto/zen/zen.css'
  import { dropouts } from '../../lib/dropouts.svelte'
  import { app, clock, ui, PART_IDS } from '../../lib/store.svelte'
  import { TempoHold } from '../../lib/tempoHold'
  import { tip, tips } from '../../lib/tooltip/tip.svelte'
  import { stageHandlers, stageProps } from '../../lib/zen/stage'
  import type { OpenTarget } from '../stage/actions'
  import { rangeFor } from '../keystrip/keyboard'
  import { stagePage } from '../stage/page.svelte'

  const pack = packs.find((p) => p.id === 'yahaha-push')!
  const tipAction = tip as unknown as StageTipAction

  // The wall clock, for the dropouts' 30-second window.
  let nowMs = $state(Date.now())
  $effect(() => {
    const t = setInterval(() => (nowMs = Date.now()), 1000)
    return () => clearInterval(t)
  })

  const tempoHold = new TempoHold((cmd) => app.send(cmd))
  $effect(() => () => tempoHold.releaseAll())

  let metronomeOpen = $state(false)

  /** Every link leaves the pilot for the app's own screens. */
  function open(target: OpenTarget) {
    ui.view = 'stage'
    if (typeof target === 'object' && 'page' in target) {
      if (target.page === 'settings') ui.settings = true
      else if (target.page === 'library') ui.openLibrary()
      else stagePage.page = target.page
    } else if (typeof target === 'object' && 'channel' in target) {
      ui.selectedPart = target.channel
      if (target.channel < 4) app.send({ type: 'selectPart', part: target.channel })
      stagePage.page = 'channel'
    } else if (typeof target === 'object' && 'sounds' in target) {
      ui.soundList = { part: PART_IDS[Math.max(0, Math.min(3, target.sounds))], anchor: null }
    } else if (target === 'browser') ui.openLibrary('styles')
    else if (target === 'settingsAudio') ui.settings = true
    else if (target === 'rack' && !ui.rack) ui.toggleDrawer('rack')
  }

  const on = stageHandlers((cmd) => app.send(cmd), {
    state: () => app.state,
    open,
    help: (h) => (tips.help = h),
    tempo: (dir, down) => tempoHold.set(dir, down),
    metronomeSettings: () => (metronomeOpen = !metronomeOpen),
    metronomeClose: () => (metronomeOpen = false),
  })

  const props = $derived(
    stageProps(app.state, {
      library: app.library,
      page: 'stage',
      help: tips.help,
      keyRange: rangeFor(ui.keyRange, app.state.io.inputs),
      dropouts: dropouts.recent(nowMs),
      beats: clock.beats,
      pos: clock.pos,
      metronomeOpen,
    }),
  )
</script>

<div class="zen-stage">
  <ThemeScope facets={pack.facets} principles={pack.principles} mode={ui.resolvedTheme} bleed>
    <Stage
      {tipAction}
      appBar={{ ...props.appBar, ...on.appBar }}
      display={{ ...props.display, ...on.display }}
      songForm={{ ...props.songForm, ...on.songForm }}
      faders={{ ...props.faders, ...on.faders }}
      knobs={{ ...props.knobs, ...on.knobs }}
      pads={{ ...props.pads, ...on.pads }}
      keys={{ ...props.keys, ...on.keys }}
      status={{ ...props.status, ...on.status }}
    />
  </ThemeScope>
</div>

<style>
  .zen-stage {
    flex: 1;
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
</style>
