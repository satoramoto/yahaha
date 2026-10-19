<!--
  DeletePrompt (Prompts board D): Library › Racks' Delete… asks before `deleteRack`. Says what the
  rack's Quick Racks (bank on view) and the style's One Touches lose. Cancel is the default.
-->
<script lang="ts">
  import type { Action } from 'svelte/action'
  import Button from '../../ui/Button/Button.svelte'
  import Dialog from '../../ui/Dialog/Dialog.svelte'
  import { deleteLabel, listOf } from './model'

  type Props = {
    rack: { id: string; name: string }
    slots: string[]
    ots: number[]
    styleName: string
    oncancel: () => void
    ondelete: () => void
    tipAction: Action<HTMLElement, string>
  }

  let { rack, slots, ots, styleName, oncancel, ondelete, tipAction }: Props = $props()
</script>

<Dialog title="Delete {rack.name}?" width={440} onclose={oncancel}>
  <p class="body" data-prompt="deleteRack">
    {#if slots.length}
      Quick Rack{slots.length > 1 ? 's' : ''} <span class="name">{listOf(slots)}</span> will be empty{ots.length ? ', and ' : '. '}
    {/if}
    {#if ots.length}
      One Touch {listOf(ots)} of <span class="name">{styleName}</span>
      {ots.length > 1 ? 'go' : 'goes'} back to the style's own.
    {/if}
    The sounds stay in your Library.
  </p>
  <div class="actions">
    <Button label="Cancel" size="md" chosen name="Cancel: keep {rack.name} (default)" tip="library.rack_delete_cancel" {tipAction} onpress={oncancel} />
    <Button label="Delete" size="md" hue="ending" name={deleteLabel(rack.name, slots, ots)} tip="library.rack_delete_confirm" {tipAction} onpress={ondelete} />
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
  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }
</style>
