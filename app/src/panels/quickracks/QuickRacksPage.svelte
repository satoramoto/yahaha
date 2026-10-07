<!--
  QuickRacksPage: the Quick Racks display page, in the Stage's display box (ui/Stage's `page`
  slot). The wiring of ui/QuickRacks: state → props through model.ts, each control → its command.

  State: quickRacks, liveRack, racks, ots. Commands: pressQuickRack, storeRack, clearQuickRack,
  stepQuickRackBank, stepQuickRack, toggleQuickRackStore, saveRack / saveRackAs (a waiting Store),
  recallOts, setOtsRack / clearOtsRack, toggleOtsLink, setOtsLinkTiming. Library › Racks opens the
  Library on its Racks page, where the rack files are browsed. The rack prompts (unsaved changes,
  sound names) are asked in the Rack drawer, which opens when one appears (openRackDrawerOnPrompt).
-->
<script lang="ts">
  import { app, ui } from '../../lib/store.svelte'
  import QuickRacks from '../../ui/QuickRacks/QuickRacks.svelte'
  import type { PageProps } from '../stage/page.svelte'
  import { bankCmds, clearCmd, otsRackCmd, quickRacksView, saveCmd, slotCmd, storeCmd, timingCmd } from './model'
  import { openRackDrawerOnPrompt } from './rackPromptDrawer.svelte'

  let { tipAction }: PageProps = $props()

  /** The name typed for a waiting Store of a never-saved rack; null: the live rack's name. */
  let rackName = $state<string | null>(null)

  const view = $derived(quickRacksView(app.state, rackName))

  // A Store with nothing waiting forgets the name typed.
  $effect(() => {
    if (app.state.quickRacks.storeWaiting === null) rackName = null
  })

  openRackDrawerOnPrompt()
</script>

<QuickRacks
  {...view}
  {tipAction}
  onbank={(to) => bankCmds(app.state.quickRacks.bank, to).forEach((c) => app.send(c))}
  onstep={(delta) => app.send({ type: 'stepQuickRack', delta })}
  onstore={() => app.send({ type: 'toggleQuickRackStore' })}
  onslot={(i) => app.send(slotCmd(i))}
  onslotlong={(i) => app.send(storeCmd(i))}
  onclear={(i) => app.send(clearCmd(app.state, i))}
  onlibrary={() => ui.openLibrary('racks')}
  onots={(i) => app.send({ type: 'recallOts', index: i })}
  onotsrack={(i, rack) => app.send(otsRackCmd(i, rack))}
  onlink={() => app.send({ type: 'toggleOtsLink' })}
  ontiming={(t) => app.send(timingCmd(t))}
  onname={(name) => (rackName = name)}
  onsave={() => app.send(saveCmd(app.state, rackName))}
  oncancel={() => app.send({ type: 'toggleQuickRackStore' })}
/>
