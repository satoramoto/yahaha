<!--
  The layout shell (docs/specs/push/Stage.md, "The app shell around it"): a column filling
  the window, holding the Stage screen (panels/stage/StageScreen, the library's Stage scaled to
  fit). There is no help footer: the hovered or focused control's tooltip shows in the status
  line above the keys (panels/stage/hint.svelte.ts), and in Library's own status line under it.

  ┌──────────────────────────────────────────────────────────────────┐
  │ StageScreen: the 1440 × 900 Stage, scaled and centred            │
  │   app bar · section row · display · band · status line · keys   │
  │   (another page tab: "Coming soon" under the same app bar;       │
  │    the Settings tab and Alt+T show the Settings screen instead:  │
  │    panels/settings/SettingsScreen, while `ui.settings` is on)    │
  └──────────────────────────────────────────────────────────────────┘

  The old panels (header, lead sheet, Launchkey mirror, mixer row, Quick Racks row, key strip,
  Channel view) stay on disk but aren't routed; each page tab brings its page back when its
  spec is built. Until then the Alt keys keep opening today's drawers and Library over the
  Stage (lib/nav.ts), and the Stage's links open them (Stage.md D32): the Rack, Effects,
  Multi Pads, Looper, Charts and Harmony drawers (lib/ui/Overlay), the style
  Browser and the Sound Browser stay as they were, unscaled, in the old tokens. Library
  (`ui.view`) takes the Stage's place, unscaled, as before.
-->
<script lang="ts">
  import { onDestroy, untrack } from 'svelte'
  import type { Action } from 'svelte/action'
  import type { Session } from './lib/api/session'
  import { dropouts } from './lib/dropouts.svelte'
  import { handleBlur, handleKey, handleKeyUp } from './lib/shortcuts'
  import { app, clock, ui } from './lib/store.svelte'
  import { TIPS } from './help/tooltips'
  import { plainTip, tip, tips, TOOLTIP_ID } from './lib/tooltip/tip.svelte'
  import StatusLine from './ui/StatusLine/StatusLine.svelte'
  import { useStatusHint } from './panels/stage/hint.svelte'
  import { status } from './panels/stage/model'
  import Browser from './panels/browser/Browser.svelte'
  import Charts from './panels/charts/Charts.svelte'
  import Harmony from './panels/harmony/Harmony.svelte'
  import Effects from './panels/effects/Effects.svelte'
  import { channelNav } from './panels/channel/nav.svelte'
  import Looper from './panels/looper/Looper.svelte'
  import MultiPad from './panels/multipad/MultiPad.svelte'
  import RackPanel from './panels/rack/RackPanel.svelte'
  import Library from './panels/library/Library.svelte'
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

  // Library's status line (the Stage has its own): the message, or the hovered control's tooltip.
  const hint = useStatusHint()
  const libraryStatus = $derived(status(app.state, hint.current))
  const tipAction = tip as unknown as Action<HTMLElement, string>

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
    <!-- Library replaces the stage (docs/racks.md, "Screens"); the band keeps playing. -->
    <main class="library-slot">
      <Library />
      <div class="library-status" data-theme={ui.theme}>
        <StatusLine {...libraryStatus} {tipAction} onclear={() => app.send({ type: 'clearMessage' })} />
      </div>
    </main>
  {:else}
    <main class="stage-slot"><StageScreen /></main>
  {/if}
</div>

<!-- The focused control's entry as plain text, for screen readers (`aria-describedby`). -->
<div id={TOOLTIP_ID} class="visually-hidden">{tips.focused ? plainTip(TIPS[tips.focused]) : ''}</div>

{#if ui.rack}<RackPanel />{/if}
{#if ui.effects}<Effects />{/if}
{#if ui.looper}<Looper />{/if}
{#if ui.multipad}<MultiPad />{/if}
{#if ui.charts}<Charts />{/if}
{#if ui.harmony}<Harmony />{/if}
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
  .library-slot {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    padding: 0.5rem 16px 0.6rem;
  }
  .library-slot > :global(:first-child) {
    flex: 1;
    min-height: 0;
  }
  .library-status {
    flex: none;
    padding-top: var(--space-8);
    background: transparent;
    color: var(--t);
  }
</style>
