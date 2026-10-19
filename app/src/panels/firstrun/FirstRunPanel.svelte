<!--
  FirstRunPanel: the first-run content in the Stage display's side slot, shown until the player
  first starts the band (`ui.firstRunDone`, StageScreen). The wiring of ui/FirstRun (FirstRun
  board): state → props through model.ts. "Choose a style" opens Library › Styles and ends first
  run; "Ready now" ends it and leaves the Stage as it is.

  State: library, io (SoundFonts), plugins, pads (the Launchkey), style, transport.
-->
<script lang="ts">
  import type { Action } from 'svelte/action'
  import { app, ui } from '../../lib/store.svelte'
  import FirstRun from '../../ui/FirstRun/FirstRun.svelte'
  import { firstRunView } from './model'

  let { tipAction }: { tipAction?: Action<HTMLElement, string> } = $props()

  const view = $derived(firstRunView(app.state))
</script>

<FirstRun
  {...view}
  {tipAction}
  onchoose={() => {
    ui.openLibrary('styles')
    ui.setFirstRunDone(true)
  }}
  onready={() => ui.setFirstRunDone(true)}
/>
