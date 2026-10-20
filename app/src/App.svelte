<!--
  The layout shell (docs/specs/push/Stage.md, "The app shell around it"): a column filling
  the window, holding the Stage screen (panels/zen/ZenStageScreen, zen's Svelte Stage laid out to
  the window; the former Stage, panels/stage/StageScreen scaled from 1440 × 900, with `?legacy`
  for one release). There is no help footer: the hovered or focused control's tooltip shows in
  the status line above the keys (panels/stage/hint.svelte.ts), on the Stage and on Library alike.

  ┌──────────────────────────────────────────────────────────────────┐
  │ ZenStageScreen: zen's Stage, laid out to the window              │
  │   app bar · display · song form · band · status line · keys     │
  │   (a display page tab: its page in the display's place, the rest │
  │    as on the Stage; the Settings tab and Alt+T show the Settings │
  │    screen instead: panels/settings/SettingsScreen, while         │
  │    `ui.settings` is on)                                          │
  └──────────────────────────────────────────────────────────────────┘

  The display pages (Channel, Effects, Quick Racks, Multi Pads, Looper, Harm/Arp) are page
  tabs on the Stage; each has an Alt key that shows it (lib/nav.ts): Alt+C Channel, Alt+E
  Effects, Alt+Q Quick Racks, Alt+P Multi Pads, Alt+L Looper, Alt+H Harm/Arp. Alt+T shows
  Settings, Alt+B Library, Alt+R Library › Racks, Alt+Y Library › Style map, Alt+S Library ›
  Styles and Alt+O the Rack. Library (`ui.view` 'library': the app bar's Library tab, Alt+B)
  takes the Stage's place as the library's Library screen (panels/library/LibraryScreen),
  scaled like the Stage; so does the Rack (`ui.view` 'rack', for now the old RackPanel, docked,
  until the Rack lane replaces it). The Sound Browser stays as it was, unscaled, in the old tokens.

  Over every page: one dialog host (panels/prompts/PromptHost) and the quick sound list
  (panels/sounds/SoundPick, while `ui.soundList` is set).
-->
<script lang="ts">
  import { onDestroy, untrack } from 'svelte'
  import type { Session } from './lib/api/session'
  import { dropouts } from './lib/dropouts.svelte'
  import { handleBlur, handleKey, handleKeyUp } from './lib/shortcuts'
  import { app, clock, ui } from './lib/store.svelte'
  import { TIPS } from './help/tooltips'
  import { plainTip, tips, TOOLTIP_ID } from './lib/tooltip/tip.svelte'
  import { channelNav } from './panels/channel/nav.svelte'
  import PromptHost from './panels/prompts/PromptHost.svelte'
  import RackPanel from './panels/rack/RackPanel.svelte'
  import LibraryScreen from './panels/library/LibraryScreen.svelte'
  import SettingsScreen from './panels/settings/SettingsScreen.svelte'
  import SoundPick from './panels/sounds/SoundPick.svelte'
  import SoundPicker from './panels/sounds/SoundPicker.svelte'
  import StageScreen from './panels/stage/StageScreen.svelte'
  import { stagePage } from './panels/stage/page.svelte'
  import ZenStageScreen from './panels/zen/ZenStageScreen.svelte'

  let { session }: { session: Session } = $props()

  // `?legacy`: the former Stage (panels/stage/StageScreen) instead of zen's, for one release.
  if (new URLSearchParams(location.search).has('legacy')) ui.legacyStage = true

  // The session attaches before the screens mount, so they mount on its state: zen's Stage
  // (its Tree) throws when the state changes in the same flush as its first mount.
  untrack(() => app.attach(session))
  $effect(() => {
    clock.start()
    return () => {
      clock.stop()
      app.detach()
    }
  })
  onDestroy(() => session.dispose())

  // Theme 'system' follows the computer's light/dark setting while the app runs.
  $effect(() => ui.watchSystemTheme())

  $effect(() => {
    document.documentElement.dataset.theme = ui.resolvedTheme
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

  // A rack prompt that opened the Rack page goes back where it came from once answered
  // (panels/quickracks/rackPromptDrawer), until PromptHost asks the prompts as dialogs.
  $effect(() => {
    const asking = app.state.liveRack.prompt !== null
    if (!asking) untrack(() => ui.promptReturn && ui.promptAnswered())
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
  {:else if ui.view === 'rack'}
    <!-- The Rack page (Alt+O): the old Rack panel, docked, until the Rack lane replaces it. -->
    <main class="stage-slot rack-slot"><RackPanel docked /></main>
  {:else if ui.legacyStage}
    <!-- The former Stage (`?legacy`), for one release. -->
    <main class="stage-slot"><StageScreen /></main>
  {:else}
    <!-- The Stage: zen's Svelte Stage, with the display pages and side panels in its slots. -->
    <main class="stage-slot"><ZenStageScreen /></main>
  {/if}
</div>

<!-- The focused control's entry as plain text, for screen readers (`aria-describedby`). -->
<div id={TOOLTIP_ID} class="visually-hidden">{tips.focused ? plainTip(TIPS[tips.focused]) : ''}</div>

<!-- The Sound Browser only picks for a program map rule now (Style map); Library took over
     choosing a part's sound. -->
{#if ui.soundPick !== null}<SoundPicker pick={ui.soundPick} />{/if}
<!-- A part's quick sound list (the Stage's sound row), over any page. -->
{#if ui.soundList !== null}<SoundPick list={ui.soundList} />{/if}
<!-- The one dialog host: rack prompts and the open-file wait card. -->
<PromptHost />

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
  .rack-slot > :global(*) {
    flex: 1;
    min-width: 0;
  }
</style>
