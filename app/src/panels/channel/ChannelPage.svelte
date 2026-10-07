<!--
  ChannelPage: the Channel display page, in the Stage's display box (ui/Stage's `page` slot,
  --page-width × --page-height). The library's Channel (ui/Channel) with the app's state: the open
  part is `ui.selectedPart`, the chosen group tab `channelNav.tab`; the part's CPU comes from the
  meters (read once a second while the page shows). Each change goes out as its command
  (model.ts `channelCommand`); a part opens through `channelNav.show`; the sound opens Library ›
  Sounds for the part; Edit opens the plugin's editor.
-->
<script lang="ts">
  import type { Meters } from '../../lib/api/types'
  import { app, ui } from '../../lib/store.svelte'
  import Channel from '../../ui/Channel/Channel.svelte'
  import type { PageProps } from '../stage/page.svelte'
  import { channelCommand, channelData, normPart } from './model'
  import { channelNav } from './nav.svelte'

  let { tipAction }: PageProps = $props()

  const CPU_MS = 1000

  let meters: Meters | null = $state(null)
  $effect(() => {
    let live = true
    const read = () =>
      app.meters().then((m) => {
        if (live) meters = m
      })
    read()
    const t = setInterval(read, CPU_MS)
    return () => {
      live = false
      clearInterval(t)
    }
  })

  const part = $derived(normPart(ui.selectedPart))
  const data = $derived(channelData({ state: app.state, meters, part, tab: channelNav.tab }))
</script>

<Channel
  {data}
  {tipAction}
  onchange={(change) => {
    const cmd = channelCommand(app.state, part, change)
    if (cmd) app.send(cmd)
  }}
  onpart={(p) => channelNav.show(p)}
  ontab={(tab) => (channelNav.tab = tab)}
  onsound={() => {
    if (part < 4) ui.openLibrary('sounds', part)
  }}
  onedit={() => app.pluginEditor(part, true)}
/>
