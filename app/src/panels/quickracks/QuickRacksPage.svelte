<!--
  QuickRacksPage: the Quick Racks display page, in the Stage's display box (ui/Stage's `page`
  slot). The wiring of ui/QuickRacks: state → props through model.ts, each control → its command.

  State: quickRacks, liveRack, racks, ots. Commands: pressQuickRack, storeRack, clearQuickRack,
  setQuickRackBank, undoQuickRackStore, stepQuickRack, toggleQuickRackStore, saveRack / saveRackAs (a waiting Store),
  recallOts, setOtsRack / clearOtsRack, toggleOtsLink, setOtsLinkTiming. Library › Racks opens the
  Library on its Racks page, where the rack files are browsed. The rack prompts (unsaved changes,
  sound names, a waiting Store) are asked as dialogs over every page (panels/prompts/PromptHost).
-->
<script lang="ts">
  import { app, ui } from '../../lib/store.svelte'
  import QuickRacks from '../../ui/QuickRacks/QuickRacks.svelte'
  import type { PageProps } from '../stage/page.svelte'
  import { bankCmd, clearCmd, otsRackCmd, quickRacksView, slotCmd, storeCmd, timingCmd, undoCmd } from './model'

  let { tipAction }: PageProps = $props()

  const view = $derived(quickRacksView(app.state, null))
</script>

<!-- A waiting Store is asked in the Store dialog (panels/prompts), not inline: `waiting` stays unfed. -->
<QuickRacks
  {...view}
  waiting={null}
  {tipAction}
  onbank={(to) => app.send(bankCmd(to))}
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
  onundo={() => app.send(undoCmd)}
/>
