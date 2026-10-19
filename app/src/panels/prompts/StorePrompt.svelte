<!--
  StorePrompt (Prompts board A): an armed Store tap waits for the live rack's save. Shows the bank
  on view with the waiting slot, a name field when the rack was never saved, Cancel
  (`toggleQuickRackStore`) and Save and store (`saveRack` / `saveRackAs`; the session stores it).
-->
<script lang="ts">
  import type { Action } from 'svelte/action'
  import { quickLabel, bankLetter } from '../../lib/api/quick-racks'
  import type { AppCmd, QuickRackButton } from '../../lib/api/types'
  import Button from '../../ui/Button/Button.svelte'
  import Dialog from '../../ui/Dialog/Dialog.svelte'
  import { storeReason } from './model'
  import NameField from './NameField.svelte'

  type Props = {
    bank: number
    buttons: QuickRackButton[]
    slot: number
    rack: { name: string; id: string | null; modified: boolean }
    busy: boolean
    send: (cmd: AppCmd) => void
    tipAction: Action<HTMLElement, string>
  }

  let { bank, buttons, slot, rack, busy, send, tipAction }: Props = $props()

  const label = $derived(quickLabel(bank, slot))
  // svelte-ignore state_referenced_locally
  let name = $state(rack.name)
  const trimmed = $derived(name.trim())
  const fresh = $derived(rack.id === null)
  const reason = $derived(storeReason(rack))
  const disabled = $derived(busy || (fresh && trimmed === ''))

  function face(b: QuickRackButton, i: number): string {
    if (i === slot) return 'waiting'
    if (b.loaded) return 'loaded'
    if (b.missing) return 'missing'
    return b.rack ? 'stored' : 'empty'
  }

  const cancel = () => !busy && send({ type: 'toggleQuickRackStore' })
  function save() {
    if (disabled) return
    send(fresh && trimmed !== rack.name ? { type: 'saveRackAs', name: trimmed } : { type: 'saveRack' })
  }
  const saveName = $derived(
    fresh ? (trimmed ? `Save the rack as ${trimmed} and store it to Quick Rack ${label}` : `Save the rack and store it to Quick Rack ${label}`) : `Save ${rack.name} and store it to Quick Rack ${label}`,
  )
</script>

<Dialog title="Store to Quick Rack {label}?" width={440} onclose={cancel}>
  <p class="body" data-prompt="store">
    An armed tap waits for Save while the live rack is modified or never saved.
    {reason.before}{#if reason.name}<span class="name">{reason.name}</span>{/if}{reason.after}
    Storing over a stored slot doesn't ask: the rack it held stays in your racks.
  </p>
  <div class="bank" role="img" aria-label="Bank {bankLetter(bank)}, {label} chosen">
    {#each buttons as b, i (i)}
      <span class="cell {face(b, i)}" data-slot={i} aria-hidden="true">
        {quickLabel(bank, i)}
        {#if i === slot}<span class="here">here</span>{/if}
      </span>
    {/each}
  </div>
  {#if fresh}
    <NameField id="dlg-store-field-0" label="Rack name" bind:value={name} tipKey="quick.save_name" ariaLabel="Rack name" onenter={save} />
  {/if}
  <div class="actions">
    <Button label="Cancel" size="md" disabled={busy} name="Cancel: nothing is saved or stored" tip="quick.cancel_store" {tipAction} onpress={cancel} />
    <Button label="Save and store" size="md" chosen {disabled} name={saveName} tip="quick.save" {tipAction} onpress={save} />
  </div>
</Dialog>

<style>
  .body {
    margin: 0;
    color: var(--m);
    font-size: 14px;
    line-height: 20px;
  }
  .name {
    color: var(--t);
  }
  .bank {
    display: grid;
    grid-template-columns: repeat(8, minmax(0, 1fr));
    gap: 6px;
    height: 44px;
  }
  .cell {
    position: relative;
    box-sizing: border-box;
    padding: 6px 0 0 7px;
    border-radius: var(--radius);
    background: var(--btn);
    color: var(--t2);
    font-size: 13px;
    font-weight: 500;
    line-height: 16px;
  }
  .cell.loaded {
    background: var(--t);
    color: var(--g);
  }
  .cell.missing {
    color: var(--warn);
  }
  .cell.empty {
    color: var(--d);
  }
  .cell.waiting {
    padding: 5px 0 0 6px;
    border: 1px solid var(--t);
    color: var(--t);
  }
  .here {
    position: absolute;
    left: 6px;
    bottom: 4px;
    color: var(--t2);
    font-size: 11px;
    font-weight: 400;
    line-height: 14px;
  }
  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }
</style>
