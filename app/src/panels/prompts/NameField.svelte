<!--
  NameField: a prompt's name field (Prompts.md › Name field). A label (with an optional part tag)
  over an underlined input; the text is selected on focus so typing replaces it; Enter calls
  `onenter`. The prompt owns the value.
-->
<script lang="ts">
  import { tip } from '../../lib/tooltip/tip.svelte'
  import type { TipKey } from '../../help/tooltips'

  type Props = {
    id: string
    label: string
    tag?: { text: string; hue: string }
    value: string
    tipKey: TipKey
    ariaLabel: string
    onenter?: () => void
  }

  let { id, label, tag, value = $bindable(), tipKey, ariaLabel, onenter }: Props = $props()
</script>

<div class="field">
  <label for={id}>
    {#if tag}<span class="tag" data-hue={tag.hue} style:color={`var(--${tag.hue})`}>{tag.text}</span>{/if}
    {label}
  </label>
  <input
    {id}
    type="text"
    spellcheck="false"
    autocomplete="off"
    maxlength="80"
    aria-label={ariaLabel}
    aria-invalid={value.trim() === '' ? 'true' : undefined}
    bind:value
    use:tip={tipKey}
    onfocus={(e) => e.currentTarget.select()}
    onkeydown={(e) => {
      if (e.key !== 'Enter') return
      e.preventDefault()
      onenter?.()
    }}
  />
</div>

<style>
  .field {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  label {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--m);
    font-size: 12px;
    line-height: 16px;
  }
  .tag {
    font-weight: 500;
  }
  input {
    height: 32px;
    box-sizing: border-box;
    width: 100%;
    padding: 4px 0 3px;
    border: 0;
    border-bottom: 1px solid var(--t);
    border-radius: 0;
    background: none;
    color: var(--t);
    caret-color: var(--t);
    font: inherit;
    font-size: 18px;
    font-weight: 300;
    line-height: 24px;
    outline: none;
    cursor: text;
  }
</style>
