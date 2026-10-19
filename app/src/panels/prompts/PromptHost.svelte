<!--
  PromptHost: the app's one dialog host, mounted once by App over every page (Prompts.md). Shows
  the one prompt that applies (model.ts `pickPrompt`) in ui/Dialog over a scrim, with the status
  line (`state.message`) drawn over the scrim so a refusal stays readable:
  - the open-file wait card while a system file chooser is up (fileWait, Prompts-More G);
  - Sound names and Unsaved changes (`liveRack.prompt`), Store (`quickRacks.storeWaiting`): the
    session's questions, which close when the state stops asking;
  - Delete (Library › Racks' Delete…, `racksState.confirming`): the app's own, closed by its
    buttons.
  Once a session prompt has sent, its buttons are disabled until the next state, so a double
  click never sends twice.
-->
<script lang="ts">
  import type { Action } from 'svelte/action'
  import type { AppCmd } from '../../lib/api/types'
  import { app } from '../../lib/store.svelte'
  import { tip } from '../../lib/tooltip/tip.svelte'
  import StatusLine from '../../ui/StatusLine/StatusLine.svelte'
  import { racksActions } from '../library/racksModel'
  import { racksState } from '../library/racksState.svelte'
  import DeletePrompt from './DeletePrompt.svelte'
  import { fileWait } from './fileWait.svelte'
  import { pickPrompt } from './model'
  import OpenFileWait from './OpenFileWait.svelte'
  import SoundNamesPrompt from './SoundNamesPrompt.svelte'
  import StorePrompt from './StorePrompt.svelte'
  import UnsavedPrompt from './UnsavedPrompt.svelte'

  const tipAction = tip as unknown as Action<HTMLElement, string>

  const prompt = $derived(pickPrompt(app.state, { deleteRack: racksState.confirming, openFile: fileWait.pick }))

  // One send per answer: locked once sent, unlocked by the next state.
  let busy = $state(false)
  $effect(() => {
    void app.state
    busy = false
  })
  function send(cmd: AppCmd) {
    if (busy) return
    busy = true
    app.send(cmd)
  }

  const racks = racksActions({ state: () => app.state, send: (cmd) => app.send(cmd) })
  const message = $derived(app.state.message)
</script>

{#if prompt}
  {#if prompt.kind === 'openFile'}
    <OpenFileWait pick={prompt.pick} />
  {:else if prompt.kind === 'soundNames'}
    {#key prompt.parts.map((p) => p.part).join()}
      <SoundNamesPrompt parts={prompt.parts} saveAs={prompt.saveAs} {busy} {send} {tipAction} />
    {/key}
  {:else if prompt.kind === 'unsavedChanges'}
    <UnsavedPrompt rack={prompt.rack} then={prompt.then} {busy} {send} {tipAction} />
  {:else if prompt.kind === 'store'}
    <StorePrompt bank={prompt.bank} buttons={prompt.buttons} slot={prompt.slot} rack={prompt.rack} {busy} {send} {tipAction} />
  {:else if prompt.kind === 'deleteRack'}
    <DeletePrompt
      rack={prompt.rack}
      slots={prompt.slots}
      ots={prompt.ots}
      styleName={prompt.styleName}
      oncancel={() => racks.oncanceldelete?.()}
      ondelete={() => racks.ondelete?.()}
      {tipAction}
    />
  {/if}
  <div class="status">
    <StatusLine text={message?.text ?? null} error={message?.error ?? false} seq={message?.seq ?? 0} {tipAction} onclear={() => app.send({ type: 'clearMessage' })} />
  </div>
{/if}

<style>
  /* Over the Dialog's scrim (z-index 100), where the Stage's own status line sits. */
  .status {
    position: fixed;
    left: var(--space-16);
    right: var(--space-16);
    bottom: 80px;
    z-index: 101;
  }
</style>
