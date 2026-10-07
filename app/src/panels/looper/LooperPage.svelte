<!--
  LooperPage: the Chord Looper display page, in the Stage's display box (ui/Stage's `page` slot,
  sized by --page-width × --page-height): the library's Looper fed from the engine's Chord Looper
  state (model.ts looperPage), its changes sent as commands (model.ts looperChange). The Memory /
  Clear latch, the Load list and the typed bank name are the page's own state; the engine owns
  everything else. Commands: looperRec, looperOnOff, selectLooperMemory, storeLooperMemory,
  clearLooperMemory, newLooperBank, saveLooperBank, loadLooperBank.
-->
<script lang="ts">
  import { app, clock } from '../../lib/store.svelte'
  import Looper from '../../ui/Looper/Looper.svelte'
  import type { LooperChange } from '../../ui/Looper/types'
  import type { PageProps } from '../stage/page.svelte'
  import { LOCAL_CLOSED, looperChange, looperPage, type LooperLocal } from './model'

  let { tipAction }: PageProps = $props()

  let local = $state<LooperLocal>({ ...LOCAL_CLOSED })

  const data = $derived(looperPage(app.state, local, clock.pos))

  function onchange(change: LooperChange) {
    const next = looperChange(change, local, app.state.looper)
    local = next.local
    for (const cmd of next.cmds) app.send(cmd)
  }
</script>

<Looper {...data} {tipAction} {onchange} />
