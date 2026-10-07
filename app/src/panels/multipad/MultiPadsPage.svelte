<!--
  MultiPadsPage: the Multi Pads display page, in the Stage's display box (ui/Stage's `page` slot).
  It draws the library's MultiPads (app/src/ui/MultiPads) from the app state and sends what the
  page asks for as commands (model.ts).

  State: multiPad, mixer.multiPadVolume(Waiting), transport.running, clock.beats. Commands:
  triggerMultiPad, stopMultiPad, stopAllMultiPads, armMultiPad, setMultiPadRepeat,
  setMultiPadChordMatch, loadMultiPad, loadMultiPadPath (Load…, after the system file picker),
  clearMultiPad, setMultiPadVolume, setMultiPadSynchroStop.
-->
<script lang="ts">
  import { app, clock } from '../../lib/store.svelte'
  import MultiPads from '../../ui/MultiPads/MultiPads.svelte'
  import type { MultiPadsChange } from '../../ui/MultiPads/types'
  import type { PageProps } from '../stage/page.svelte'
  import { loadPadFile, multiPadsCommand, multiPadsData } from './model'

  let { tipAction }: PageProps = $props()

  const data = $derived(multiPadsData(app.state, clock.beats))

  function onchange(change: MultiPadsChange) {
    if (change.type === 'loadFile') void loadPadFile((cmd) => app.send(cmd))
    else app.send(multiPadsCommand(change))
  }
</script>

<MultiPads {data} {tipAction} {onchange} />
