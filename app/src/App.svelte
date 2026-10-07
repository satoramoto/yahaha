<!--
  The layout shell (docs/specs/push/Stage.md, "The app shell around it"): a column filling
  the window, holding the Stage screen (panels/stage/StageScreen, the library's Stage scaled to
  fit). There is no help footer: the hovered or focused control's tooltip shows in the status
  line above the keys (panels/stage/hint.svelte.ts), on the Stage and on Library alike.

  ┌──────────────────────────────────────────────────────────────────┐
  │ StageScreen: the 1440 × 900 Stage, scaled and centred            │
  │   app bar · section row · display · band · status line · keys   │
  │   (a display page tab: its page in the display's box, the rest   │
  │    as on the Stage; the Settings tab and Alt+T show the Settings │
  │    screen instead: panels/settings/SettingsScreen, while         │
  │    `ui.settings` is on)                                          │
  └──────────────────────────────────────────────────────────────────┘

  The old panels (header, lead sheet, Launchkey mirror, mixer row, Quick Racks row, key strip,
  Channel view) stay on disk but aren't routed. The display pages (Channel, Effects, Quick
  Racks, Multi Pads, Looper, Harm/Arp) are page tabs on the Stage; Alt+E, Alt+P, Alt+L and
  Alt+H show theirs (lib/nav.ts). The Rack and Charts drawers (lib/ui/Overlay), the style
  Browser and the Sound Browser stay as they were, unscaled, in the old tokens. Library
  (`ui.view`: the app bar's Library tab, Alt+B) takes the Stage's place as the library's
  Library screen (panels/library/LibraryScreen), scaled like the Stage.
-->
<script lang="ts">
  import { onDestroy, untrack } from 'svelte'
  import type { Session } from './lib/api/session'
  import { dropouts } from './lib/dropouts.svelte'
  import { handleBlur, handleKey, handleKeyUp } from './lib/shortcuts'
  import { app, clock, ui } from './lib/store.svelte'
  import { TIPS } from './help/tooltips'
  import { plainTip, tips, TOOLTIP_ID } from './lib/tooltip/tip.svelte'
  import Browser from './panels/browser/Browser.svelte'
  import Charts from './panels/charts/Charts.svelte'
  import { channelNav } from './panels/channel/nav.svelte'
  import RackPanel from './panels/rack/RackPanel.svelte'
  import LibraryScreen from './panels/library/LibraryScreen.svelte'
  import SettingsScreen from './panels/settings/SettingsScreen.svelte'
  import SoundPicker from './panels/sounds/SoundPicker.svelte'
  import StageScreen from './panels/stage/StageScreen.svelte'
  import { stagePage } from './panels/stage/page.svelte'

  let { session }: { session: Session } = $props()

  $effect(() => {
    app.attach(session)
    clock.start()
    return () => {
      clock.stop()
      app.detach()
    }
  })
  onDestroy(() => session.dispose())

  $effect(() => {
    document.documentElement.dataset.theme = ui.theme
    document.documentElement.dataset.help = tips.help ? 'on' : 'off'
  })

  // The health slot shows audio dropouts (Stage.md D54): count them on every state.
  $effect(() => {
    const s = app.state.io.synth
    untrack(() => dropouts.observe(s ? { dropouts: s.dropouts ?? 0, bufferFrames: s.bufferFrames } : null, Date.now()))
  })

  // Library is a page of its own (`ui.view`), not a Stage page tab: a link that names the
  // 'library' tab (from any screen's app bar) opens it.
  $effect(() => {
    if (stagePage.page !== 'library') return
    untrack(() => {
      stagePage.page = 'stage'
      ui.settings = false
      ui.openLibrary()
    })
  })

  /** Esc closes what's open over the stage first (handleKey), then goes back to the Stage. */
  function onKey(e: KeyboardEvent) {
    handleKey(e)
    if (e.key !== 'Escape' || e.defaultPrevented) return
    if (channelNav.escape() || stagePage.escape()) e.preventDefault()
  }
</script>

<svelte:window onkeydown={onKey} onkeyup={handleKeyUp} onblur={handleBlur} />

<div class="app">
  {#if ui.settings}
    <!-- Settings (the Settings tab, Alt+T) takes the main slot, whatever ui.view is; Esc
         (ui.escape) or another page tab leaves it. -->
    <main class="stage-slot"><SettingsScreen /></main>
  {:else if ui.view === 'library'}
    <!-- Library replaces the stage (panels/library/LibraryScreen, scaled like it); the band keeps playing. -->
    <main class="stage-slot"><LibraryScreen /></main>
  {:else}
    <main class="stage-slot"><StageScreen /></main>
  {/if}
</div>

<!-- The focused control's entry as plain text, for screen readers (`aria-describedby`). -->
<div id={TOOLTIP_ID} class="visually-hidden">{tips.focused ? plainTip(TIPS[tips.focused]) : ''}</div>

{#if ui.rack}<RackPanel />{/if}
{#if ui.charts}<Charts />{/if}
{#if ui.browser}<Browser />{/if}
<!-- The Sound Browser only picks for a program map rule now (Style map); Library took over
     choosing a part's sound. -->
{#if ui.soundPick !== null}<SoundPicker pick={ui.soundPick} />{/if}

<style>
  .app {
    display: flex;
    flex-direction: column;
    height: 100vh;
    height: 100dvh;
    overflow: hidden;
  }
  .stage-slot {
    flex: 1;
    min-height: 0;
    display: flex;
  }
</style>
