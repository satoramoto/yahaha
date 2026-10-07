<!--
  EffectsPage: the Effects display page, in the Stage's display box (ui/Stage's `page` slot): the
  library's `Effects` (app/src/ui/Effects) fed from the app's state and the open bus
  (`effectsNav`), its changes turned into commands (model.ts).
-->
<script lang="ts">
  import { app } from '../../lib/store.svelte'
  import Effects from '../../ui/Effects/Effects.svelte'
  import type { BusChange } from '../../ui/Effects/types'
  import type { PageProps } from '../stage/page.svelte'
  import { busCommand, effectsData, insertsCommand, masterCommand, mixCommand } from './model'
  import { effectsNav } from './nav.svelte'

  let { tipAction }: PageProps = $props()

  const data = $derived(effectsData(app.state, effectsNav.bus))

  function onbus(change: BusChange) {
    const cmd = busCommand(change)
    if (cmd) app.send(cmd)
    if (change.type === 'remove') effectsNav.open(0)
  }

  function onadd() {
    // The new send arrives as a Hall at the next index; open it now so it shows as it arrives.
    const next = data.list.sends.length
    app.send({ type: 'addSend', kind: 'hall' })
    effectsNav.open(next)
  }
</script>

<Effects
  {data}
  {tipAction}
  onopen={(bus) => effectsNav.open(bus)}
  {onadd}
  {onbus}
  onmaster={(change) => app.send(masterCommand(change))}
  oninserts={(change) => app.send(insertsCommand(change))}
  onmix={(change) => app.send(mixCommand(change))}
/>
