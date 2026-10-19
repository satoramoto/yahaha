<!--
  FirstRun: the first-run content in the Stage display's side slot (FirstRun board,
  docs/design/push/FirstRun-Dark.dc.html): "Choose a style" (the accent block), the three steps
  (styles, sounds, the Launchkey) each with whether it is done, and "Ready now", which says what
  is loaded and dismisses the panel. Takes its data as props (no store); panels/firstrun wires it.
-->
<script lang="ts" module>
  export interface FirstRunStep {
    /** Tooltip key. */
    tip: string
    title: string
    /** Done: the step's dot is lit. */
    done: boolean
    /** What is there, or what to do: one short line. */
    detail: string
  }
</script>

<script lang="ts">
  import type { Action } from 'svelte/action'

  let {
    style,
    tempo,
    steps,
    tipAction,
    onchoose,
    onready,
  }: {
    /** The loaded style's name and time signature ("Pop · 4/4" on the board). */
    style: { name: string; meta: string }
    tempo: number
    steps: FirstRunStep[]
    tipAction?: Action<HTMLElement, string>
    onchoose?: () => void
    onready?: () => void
  } = $props()

  const noop: Action<HTMLElement, string> = () => {}
  const tipUse = $derived(tipAction ?? noop)
</script>

<section class="first-run" aria-label="First run">
  <span class="caption">Start here</span>
  <button class="choose" aria-label="Choose a style: opens the style browser (Library, Styles)" use:tipUse={'firstrun.choose_style'} onclick={() => onchoose?.()}>
    <span class="choose-label">Choose a style</span><span aria-hidden="true" class="arrow">→</span>
  </button>
  <p class="note">A style is your band. One is loaded already, so you can start now.</p>

  <ol class="steps" aria-label="Three steps">
    {#each steps as step, i (step.tip)}
      <li class="step" use:tipUse={step.tip}>
        <span class="num">{i + 1}</span>
        <span class="dot" class:done={step.done} aria-hidden="true"></span>
        <span class="title">{step.title}</span>
        <span class="detail" title={step.detail}>{step.detail}</span>
        <span class="sr">{step.done ? 'done' : 'not yet'}</span>
      </li>
    {/each}
  </ol>

  <button class="ready" aria-label="Ready now: {style.name}, {tempo} BPM. Closes this panel" use:tipUse={'firstrun.ready'} onclick={() => onready?.()}>
    <span class="caption">Ready now</span>
    <span class="now">
      <span class="style">{style.name}</span>
      <span class="meta">{style.meta}</span>
      <span class="tempo">{tempo}</span><span class="meta">BPM</span>
    </span>
  </button>
</section>

<style>
  .first-run {
    height: 100%;
    box-sizing: border-box;
    padding: var(--space-16, 16px) var(--space-24, 24px) var(--space-12);
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
    color: var(--t);
    font: var(--type-text);
    background: var(--g);
  }
  .caption {
    color: var(--caption-ink);
  }
  button {
    font: inherit;
    color: inherit;
    cursor: pointer;
    border: 0;
    border-radius: var(--radius);
  }
  .choose {
    align-self: flex-start;
    height: 44px;
    padding: 0 var(--space-16, 16px);
    background: var(--a);
    color: var(--on-ink);
    display: flex;
    align-items: center;
    gap: var(--space-16, 16px);
    white-space: nowrap;
  }
  .choose-label {
    font-size: 26px;
    font-weight: var(--weight-regular);
    letter-spacing: -0.5px;
  }
  .arrow {
    font-size: 22px;
    font-weight: var(--weight-light);
  }
  .note {
    margin: 0;
    color: var(--m);
  }
  .steps {
    margin: var(--space-4) 0 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  .step {
    height: 22px;
    display: flex;
    align-items: center;
    gap: var(--space-8);
    white-space: nowrap;
    min-width: 0;
  }
  .num {
    width: 12px;
    color: var(--a);
    font-weight: var(--weight-light);
  }
  .dot {
    flex: none;
    width: 6px;
    height: 6px;
    box-sizing: border-box;
    border-radius: 50%;
    border: 1px solid var(--m);
  }
  .dot.done {
    border-color: var(--ok);
    background: var(--ok);
  }
  .title {
    font: var(--type-strong);
  }
  .detail {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--m);
  }
  .sr {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }
  .ready {
    margin-top: auto;
    padding: var(--space-6) 0 0;
    background: none;
    border-top: 1px solid var(--line);
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: var(--space-2);
    text-align: left;
  }
  .now {
    display: flex;
    align-items: baseline;
    gap: var(--space-8);
    white-space: nowrap;
    min-width: 0;
  }
  .style {
    font: var(--type-strong);
    font-size: 18px;
    line-height: 24px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .tempo {
    margin-left: auto;
    font: var(--type-large);
    font-size: 24px;
    line-height: 28px;
  }
  .meta {
    color: var(--m);
  }
  button:focus-visible {
    outline: 1px solid var(--focus);
    outline-offset: 2px;
  }
</style>
