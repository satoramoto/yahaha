<!--
  HarmArpPage: the Harm/Arp display page, in the Stage's display box (ui/Stage's `page` slot, sized
  by --page-width × --page-height; docs/specs/push/Harmony.md). The library's HarmArp draws it from
  the engine's Harmony/Arpeggio state (model.ts); each change it reports goes out as the command
  actions.ts makes of it. A category tab only browses (HA-D1): the browsed tab lives here, and snaps
  back to the selected type's category whenever the selection changes, here or elsewhere.
-->
<script lang="ts">
  import { app } from '../../lib/store.svelte'
  import HarmArp from '../../ui/HarmArp/HarmArp.svelte'
  import type { HarmArpCategory } from '../../ui/HarmArp/types'
  import type { PageProps } from '../stage/page.svelte'
  import { harmArpCommand } from './actions'
  import { harmArpData } from './model'

  let { tipAction }: PageProps = $props()

  const h = $derived(app.state.harmonyArp)
  /** The category tab being browsed; null: the selected type's. */
  let viewed = $state<HarmArpCategory | null>(null)

  /** The selection, as one value: it changes only when the selected type does. */
  const selection = $derived(`${h.mode}:${h.harmonyType}:${h.arpPattern}`)
  // A new selection (a pick here, or a step from the Launchkey) shows its own category.
  $effect.pre(() => {
    void selection
    viewed = null
  })

  const data = $derived(harmArpData(h, app.library, app.state.liveRack.controls.knobs, viewed))
</script>

<HarmArp
  {data}
  {tipAction}
  onchange={(c) => {
    const cmd = harmArpCommand(c, h)
    if (cmd) app.send(cmd)
  }}
  onview={(c) => (viewed = c)}
/>
