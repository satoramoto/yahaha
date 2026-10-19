<!--
  HelpCard: help mode's tip card in the Stage display's side slot (Stage-Help board). A header
  ("Help", the entry's title, its group), the body, then the Launchkey, Key and Genos rows, and the
  Pop-up tips lamp (`app.floating_tips`). With nothing hovered yet it says how help mode works.

  Help mode marks the pinned control (`data-help-mark`, set by the tooltip action): this card's
  global style draws the mark, a 2px --t outline 2px out, so it shows only while the card does.
  With Pop-up tips on and a control under the pointer or focus (`anchor`), the same entry also
  floats next to it, in a box moved to <body> so the Stage's scaling doesn't move it.
  It takes its data as props (no store); the wiring builds them (lib/tooltip/helpCard.svelte.ts).
-->
<script lang="ts" module>
  /** One catalog entry as the card draws it. */
  export interface HelpEntry {
    title: string
    body: string
    /** The control's group, at the header's right ("Transport"). */
    group: string
    /** Where it is on the Launchkey, one line each; empty: "Not on the Launchkey". */
    launchkey: string[]
    /** Its keyboard shortcuts as labels ("F", "Shift+F"); empty: none. */
    keys: string[]
    /** The Genos name; null: none. */
    genos: string | null
    /** The control's free text (its `data-tip-text`), above the body. */
    text?: string | null
  }

  /** A control's box on screen, in viewport pixels. */
  export interface HelpAnchor {
    left: number
    top: number
    right: number
    bottom: number
  }
</script>

<script lang="ts">
  import type { Action } from 'svelte/action'
  import LampButton from '../LampButton/LampButton.svelte'

  type Props = {
    /** The entry shown: the control hovered, focused or pinned; null before any. */
    entry?: HelpEntry | null
    /** Pop-up tips (`ui.floatingTips`): the entry also floats next to the control. */
    floatingTips?: boolean
    /** Where the hovered or focused control is, for the pop-up; null: no pop-up. */
    anchor?: HelpAnchor | null
    /** Called with the Pop-up tips state asked for. */
    onfloatingtips?: (on: boolean) => void
    /** The app's `use:tip` action. */
    tipAction?: Action<HTMLElement, string>
  }

  let { entry = null, floatingTips = false, anchor = null, onfloatingtips, tipAction }: Props = $props()

  const POP_WIDTH = 320
  const GAP = 8

  /** The pop-up's place: under the control, else above it, kept on screen. */
  const popAt = $derived.by(() => {
    if (!anchor) return null
    const vw = typeof window === 'undefined' ? 1440 : window.innerWidth
    const vh = typeof window === 'undefined' ? 900 : window.innerHeight
    const left = Math.max(GAP, Math.min(anchor.left, vw - POP_WIDTH - GAP))
    const below = anchor.bottom + GAP < vh - 160
    return below ? { left, top: anchor.bottom + GAP, bottom: null } : { left, top: null, bottom: vh - anchor.top + GAP }
  })

  /** Moves the node to <body>, keeping the theme it was drawn under. */
  const portal: Action<HTMLElement> = (node) => {
    const theme = node.parentElement?.closest<HTMLElement>('[data-theme]')?.dataset.theme
    if (theme) node.dataset.theme = theme
    document.body.appendChild(node)
    return { destroy: () => node.remove() }
  }
</script>

{#snippet rows(e: HelpEntry)}
  <div class="rows">
    <span class="k">Launchkey</span>
    <span class="v">{e.launchkey.length ? e.launchkey.join('; ') : 'Not on the Launchkey'}</span>
    <span class="k">Key</span>
    <span class="v">
      {#if e.keys.length}
        {#each e.keys as key, i (i)}{#if i > 0}<span class="or"> or </span>{/if}<kbd>{key}</kbd>{/each}
      {:else}
        <span class="none">None</span>
      {/if}
    </span>
    {#if e.genos}
      <span class="k">Genos</span>
      <span class="v genos">{e.genos}</span>
    {/if}
  </div>
{/snippet}

<div class="card" role="region" aria-label={entry ? `Help: ${entry.title}` : 'Help'} aria-live="polite">
  <div class="head">
    <span class="help">Help</span>
    <span class="title">{entry ? entry.title : 'Help mode'}</span>
    {#if entry}<span class="group">{entry.group}</span>{/if}
  </div>
  {#if entry}
    {#if entry.text}<p class="text">{entry.text}</p>{/if}
    <p class="body">{entry.body}</p>
    {@render rows(entry)}
  {:else}
    <p class="body">
      Hover over or tab to any control: its entry stays here while you try it, and the control keeps working. Press ?
      again to leave help mode.
    </p>
  {/if}
  <div class="foot">
    <LampButton
      label="Pop-up tips"
      hue="lamp"
      on={floatingTips}
      name={`Pop-up tips, ${floatingTips ? 'on' : 'off'}: also shows each entry in a pop-up next to the control`}
      tip="app.floating_tips"
      {tipAction}
      ontoggle={onfloatingtips}
    />
  </div>
</div>

{#if floatingTips && entry && popAt}
  <div
    class="pop"
    use:portal
    role="tooltip"
    style:width={`${POP_WIDTH}px`}
    style:left={`${popAt.left}px`}
    style:top={popAt.top === null ? undefined : `${popAt.top}px`}
    style:bottom={popAt.bottom === null ? undefined : `${popAt.bottom}px`}
  >
    <div class="pop-title">{entry.text || entry.title}</div>
    <p class="body">{entry.text ? `${entry.title}: ${entry.body}` : entry.body}</p>
    {@render rows(entry)}
  </div>
{/if}

<style>
  /* The hover mark on the pinned control (focus-ring language, not the 1px waiting outline). */
  :global([data-help-mark]) {
    outline: 2px solid var(--t);
    outline-offset: 2px;
  }
  .card {
    box-sizing: border-box;
    height: 100%;
    padding: 0 0 0 var(--space-24);
    border-left: 1px solid var(--line);
    display: flex;
    flex-direction: column;
    color: var(--t);
    font-family: var(--font-sans);
  }
  .head {
    flex: none;
    height: 36px;
    box-sizing: border-box;
    border-bottom: 1px solid var(--line);
    display: flex;
    align-items: center;
    gap: 12px;
    white-space: nowrap;
    min-width: 0;
  }
  .help {
    font-size: 14px;
    color: var(--m);
  }
  .title {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 18px;
    font-weight: 500;
    color: var(--t);
  }
  .group {
    margin-left: auto;
    font-size: 13px;
    color: var(--m);
  }
  .text {
    flex: none;
    margin: 12px 0 0;
    font-size: 14px;
    line-height: 20px;
    color: var(--t);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .body {
    flex: none;
    margin: 12px 0 0;
    font-size: 14px;
    line-height: 20px;
    color: var(--t2);
  }
  .text + .body {
    margin-top: 4px;
  }
  .rows {
    flex: none;
    margin-top: 14px;
    display: grid;
    grid-template-columns: 88px minmax(0, 1fr);
    row-gap: 6px;
    font-size: 14px;
    line-height: 20px;
    white-space: nowrap;
  }
  .k {
    color: var(--m);
  }
  .v {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--t);
  }
  .genos,
  .none,
  .or {
    color: var(--t2);
  }
  kbd {
    display: inline-block;
    min-width: 20px;
    box-sizing: border-box;
    padding: 0 5px;
    border-radius: 3px;
    background: var(--btn);
    font-family: var(--font-mono);
    font-size: 12px;
    line-height: 20px;
    text-align: center;
    color: var(--t);
  }
  .foot {
    flex: none;
    margin-top: auto;
    height: 32px;
    display: flex;
    align-items: center;
    gap: 12px;
  }
  /* The pop-up tip, on <body> next to the control. */
  .pop {
    position: fixed;
    z-index: 1000;
    box-sizing: border-box;
    padding: 12px 16px;
    border: 1px solid var(--line);
    border-radius: 4px;
    background: var(--g);
    color: var(--t);
    font-family: var(--font-sans);
    pointer-events: none;
  }
  .pop-title {
    font-size: 14px;
    font-weight: 500;
  }
  .pop .body {
    margin-top: 4px;
    font-size: 13px;
    line-height: 18px;
  }
  .pop .rows {
    margin-top: 8px;
    font-size: 13px;
  }
</style>
