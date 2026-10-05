<!--
  The layout shell (docs/specs/push/Stage.md, "The app shell around it"): a column filling
  the window, the Stage screen (panels/stage/StageScreen, the library's Stage scaled to fit)
  over the help footer.

  ┌──────────────────────────────────────────────────────────────────┐
  │ StageScreen: the 1440 × 900 Stage, scaled and centred            │
  │   app bar · section row · display · band · status line · keys   │
  │   (another page tab: "Coming soon" under the same app bar)       │
  ├──────────────────────────────────────────────────────────────────┤
  │ help footer (lib/tooltip): the hovered control's entry           │
  └──────────────────────────────────────────────────────────────────┘

  The old panels (header, lead sheet, Launchkey mirror, mixer row, Quick Racks row, key strip,
  Channel view) stay on disk but aren't routed; each page tab brings its page back when its
  spec is built. Until then the Alt keys keep opening today's drawers and Library over the
  Stage (lib/nav.ts), and the Stage's links open them (Stage.md D32): the Rack, Effects,
  Multi Pads, Looper, Settings, Charts and Harmony drawers (lib/ui/Overlay), the style
  Browser and the Sound Browser stay as they were, unscaled, in the old tokens. Library
  (`ui.view`) takes the Stage's place, unscaled, as before.
-->
<script lang="ts">
  import { onDestroy, untrack } from 'svelte'
  import type { Session } from './lib/api/session'
  import { dropouts } from './lib/dropouts.svelte'
  import { handleBlur, handleKey, handleKeyUp } from './lib/shortcuts'
  import { app, clock, ui } from './lib/store.svelte'
  import HelpFooter from './lib/tooltip/HelpFooter.svelte'
  import Tooltip from './lib/tooltip/Tooltip.svelte'
  import { tips } from './lib/tooltip/tip.svelte'
  import Browser from './panels/browser/Browser.svelte'
  import Charts from './panels/charts/Charts.svelte'
  import Harmony from './panels/harmony/Harmony.svelte'
  import Effects from './panels/effects/Effects.svelte'
  import { channelNav } from './panels/channel/nav.svelte'
  import Looper from './panels/looper/Looper.svelte'
  import MultiPad from './panels/multipad/MultiPad.svelte'
  import RackPanel from './panels/rack/RackPanel.svelte'
  import Library from './panels/library/Library.svelte'
  import Settings from './panels/settings/Settings.svelte'
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

  /** Esc closes what's open over the stage first (handleKey), then goes back to the Stage. */
  function onKey(e: KeyboardEvent) {
    handleKey(e)
    if (e.key !== 'Escape' || e.defaultPrevented) return
    if (channelNav.escape() || stagePage.escape()) e.preventDefault()
  }
</script>

<svelte:window onkeydown={onKey} onkeyup={handleKeyUp} onblur={handleBlur} />

<div class="app">
  {#if ui.view === 'library'}
    <!-- Library replaces the stage (docs/racks.md, "Screens"); the band keeps playing. -->
    <main class="library-slot"><Library /></main>
  {:else}
    <main class="stage-slot"><StageScreen /></main>
  {/if}
  <HelpFooter />
</div>

{#if ui.rack}<RackPanel />{/if}
{#if ui.effects}<Effects />{/if}
{#if ui.looper}<Looper />{/if}
{#if ui.multipad}<MultiPad />{/if}
{#if ui.settings}<Settings />{/if}
{#if ui.charts}<Charts />{/if}
{#if ui.harmony}<Harmony />{/if}
{#if ui.browser}<Browser />{/if}
<!-- The Sound Browser only picks for a program map rule now (Style map); Library took over
     choosing a part's sound. -->
{#if ui.soundPick !== null}<SoundPicker pick={ui.soundPick} />{/if}
{#if tips.floating}<Tooltip />{/if}

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
  .library-slot {
    flex: 1;
    min-height: 0;
    display: flex;
    padding: 0.5rem 16px 0.6rem;
  }
</style>
