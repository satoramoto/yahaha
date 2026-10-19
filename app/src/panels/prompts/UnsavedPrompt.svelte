<!--
  UnsavedPrompt (Prompts board B): a rack switch from the screen would lose the live rack's
  changes. Keep editing (`dismissRackPrompt`), Discard and switch (`loadRack` / `newRack` with
  `discard`), Save first (`saveRack` / `saveRackAs`; the session makes the switch once saved).
-->
<script lang="ts">
  import type { Action } from 'svelte/action'
  import type { AppCmd, RackSwitch } from '../../lib/api/types'
  import Button from '../../ui/Button/Button.svelte'
  import Dialog from '../../ui/Dialog/Dialog.svelte'
  import NameField from './NameField.svelte'

  type Props = {
    rack: { name: string; id: string | null }
    then: RackSwitch
    busy: boolean
    send: (cmd: AppCmd) => void
    tipAction: Action<HTMLElement, string>
  }

  let { rack, then, busy, send, tipAction }: Props = $props()

  // svelte-ignore state_referenced_locally
  let name = $state(rack.name)
  const trimmed = $derived(name.trim())
  const fresh = $derived(rack.id === null)
  const shown = $derived(fresh ? trimmed : rack.name)
  const disabled = $derived(busy || (fresh && trimmed === ''))
  const target = $derived(then.kind === 'load' ? `switch to ${then.name}` : 'start a new rack')

  const keep = () => !busy && send({ type: 'dismissRackPrompt' })
  function discard() {
    if (busy) return
    send(then.kind === 'load' ? { type: 'loadRack', id: then.id, discard: true } : { type: 'newRack', discard: true })
  }
  function save() {
    if (disabled) return
    send(fresh && trimmed !== rack.name ? { type: 'saveRackAs', name: trimmed } : { type: 'saveRack' })
  }
</script>

<Dialog title="Unsaved changes in {rack.name}" width={440} onclose={keep}>
  <p class="body" data-prompt="unsavedChanges">
    {#if then.kind === 'load'}Save them before switching to <span class="name">{then.name}</span>?{:else}Save them before starting a new rack?{/if}
  </p>
  <p class="note">
    Only the screen asks. The Launchkey, pedals and OTS Link switch at once and keep the edits as
    <span class="name">Recovered: {rack.name}</span>, a rack of yours in Library › Racks.
  </p>
  {#if fresh}
    <NameField id="dlg-unsaved-field-0" label="Rack name" bind:value={name} tipKey="rack.save_as_name" ariaLabel="Rack name" onenter={save} />
  {/if}
  <div class="actions">
    <Button label="Keep editing" size="md" disabled={busy} name="Keep editing: stay on {shown}" tip="rack.keep_editing" {tipAction} onpress={keep} />
    <Button
      label="Discard and switch"
      size="md"
      hue="ending"
      disabled={busy}
      name={then.kind === 'load' ? `Discard the changes and switch to ${then.name}` : 'Discard the changes and start a new rack'}
      tip="rack.discard_switch"
      {tipAction}
      onpress={discard}
    />
    <Button label="Save first" size="md" chosen {disabled} name="Save {shown} first, then {target}" tip="rack.save_first" {tipAction} onpress={save} />
  </div>
</Dialog>

<style>
  .body {
    margin: 0;
    color: var(--m);
    font-size: 14px;
    line-height: 20px;
  }
  .note {
    margin: 0;
    color: var(--m);
    font-size: 12px;
    line-height: 16px;
  }
  .name {
    color: var(--t);
  }
  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }
</style>
