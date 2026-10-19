<!--
  FirstRunPanel (stub): the first-run content in the Stage display's side slot, shown until
  the player first starts the band (`ui.firstRunDone`, StageScreen). The FirstRun lane builds
  it from docs/design/push/FirstRun-Dark.dc.html: "Choose a style" (opens Library › Styles and
  calls `ui.setFirstRunDone(true)`), the three steps and "Ready now".
-->
<script lang="ts">
  import type { Action } from 'svelte/action'

  let { tipAction: _tipAction }: { tipAction?: Action<HTMLElement, string> } = $props()
</script>

<div class="stub">First run: choose a style to begin.</div>

<style>
  .stub {
    padding: 12px;
  }
</style>
