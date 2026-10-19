<!--
  SoundNamesPrompt (Prompts board C): a save found edited presets that become new sounds. One name
  field per part; Cancel (`dismissRackPrompt`), Save sound(s) (the save again with `soundNames`).
-->
<script lang="ts">
  import type { Action } from 'svelte/action'
  import type { AppCmd } from '../../lib/api/types'
  import Button from '../../ui/Button/Button.svelte'
  import Dialog from '../../ui/Dialog/Dialog.svelte'
  import { listOf, PART_HUES, PART_TAGS, type SoundNamePart } from './model'
  import NameField from './NameField.svelte'

  type Props = {
    parts: SoundNamePart[]
    saveAs: string | null
    busy: boolean
    send: (cmd: AppCmd) => void
    tipAction: Action<HTMLElement, string>
  }

  let { parts, saveAs, busy, send, tipAction }: Props = $props()

  // svelte-ignore state_referenced_locally
  let values = $state(parts.map((p) => p.suggested))
  const many = $derived(parts.length > 1)
  const names = $derived(values.map((v) => v.trim()))
  const disabled = $derived(busy || names.some((n) => n === ''))
  const listed = $derived(listOf(names.map((n) => n || '(no name)')))

  const cancel = () => !busy && send({ type: 'dismissRackPrompt' })
  function save() {
    if (disabled) return
    const soundNames = Object.fromEntries(parts.map((p, i) => [p.part, names[i]]))
    send(saveAs === null ? { type: 'saveRack', soundNames } : { type: 'saveRackAs', name: saveAs, soundNames })
  }
</script>

<Dialog title={many ? 'Name the new sounds' : 'Name the new sound'} width={440} onclose={cancel}>
  <p class="body" data-prompt="soundNames">
    {#each parts as p (p.part)}
      {p.partName}'s <span class="name">{p.suggested}</span>{#if p.origin}<span class="origin"> · {p.origin}</span>{/if} was edited.
    {/each}
    {many
      ? 'Saving the rack keeps them as new sounds in My Sounds; the presets stay as they were.'
      : 'Saving the rack keeps it as a new sound in My Sounds; the preset stays as it was.'}
  </p>
  <div class="fields">
    {#each parts as p, i (p.part)}
      <NameField
        id="dlg-names-field-{i}"
        label="New sound name"
        tag={{ text: PART_TAGS[p.part] ?? '', hue: PART_HUES[p.part] ?? 't' }}
        bind:value={values[i]}
        tipKey="rack.sound_name"
        ariaLabel="{p.partName} new sound name"
        onenter={save}
      />
    {/each}
  </div>
  <div class="actions">
    <Button label="Cancel" size="md" disabled={busy} name="Cancel: don't save the rack" tip="rack.cancel_save" {tipAction} onpress={cancel} />
    <Button
      label={many ? 'Save sounds' : 'Save sound'}
      size="md"
      chosen
      {disabled}
      name={many ? `Save sounds: keep the edited sounds as ${listed} in My Sounds, then save the rack` : `Save sound: keep the edited sound as ${listed} in My Sounds, then save the rack`}
      tip="rack.save_names"
      {tipAction}
      onpress={save}
    />
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
  .origin {
    font-size: 12px;
  }
  .fields {
    display: flex;
    flex-direction: column;
    gap: 16px;
    max-height: 60vh;
    overflow: auto;
    min-height: 0;
  }
  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }
</style>
