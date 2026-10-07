<!--
  MultiPadsPage: the Multi Pads display page, in the Stage's display box (ui/Stage's `page` slot).
  It draws the library's MultiPads (app/src/ui/MultiPads) from the app state and sends what the
  page asks for as commands (model.ts).

  State: multiPad, mixer.multiPadVolume(Waiting), transport.running, clock.beats. Commands:
  triggerMultiPad, stopMultiPad, stopAllMultiPads, armMultiPad, setMultiPadRepeat,
  setMultiPadChordMatch, loadMultiPad, clearMultiPad, setMultiPadVolume, setMultiPadSynchroStop.
-->
<script lang="ts">
  import { app, clock } from '../../lib/store.svelte'
  import MultiPads from '../../ui/MultiPads/MultiPads.svelte'
  import type { PageProps } from '../stage/page.svelte'
  import { multiPadsCommand, multiPadsData } from './model'

  let { tipAction }: PageProps = $props()

  const data = $derived(multiPadsData(app.state, clock.beats))
</script>

<MultiPads {data} {tipAction} onchange={(change) => app.send(multiPadsCommand(change))} />
