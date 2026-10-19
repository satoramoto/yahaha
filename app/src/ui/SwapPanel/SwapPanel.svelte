<!--
  SwapPanel: the swap layer's panel in the Stage display's side slot (PadsPage2 board, state B),
  while a keyboard part's Panel fader button is held (or its lamp long-pressed on screen). The
  header names the part in its hue; a hint line; knobs 1-8 as they read (knob 1 the sound,
  "23 Rhodes Soft", mid-dial until release commits it); the part's On lamp latched (a click lets
  go), and the Launchkey's live line ("R1: 23 Rhodes Soft"). It takes its data as props (no
  store); `swapPanel(state)` in swap.ts builds `data` from the app state.
-->
<script lang="ts">
  import type { Action } from 'svelte/action'
  import LampButton from '../LampButton/LampButton.svelte'
  import type { SwapPanelData } from './swap'

  type Props = {
    /** The held part and its knobs; null draws Right 1 with empty knobs. */
    data?: SwapPanelData | null
    /** Lets go of swap mode (the On lamp's click). */
    onrelease?: () => void
    /** The app's `use:tip` action. */
    tipAction?: Action<HTMLElement, string>
  }

  let { data = null, onrelease, tipAction }: Props = $props()

  const EMPTY: SwapPanelData = {
    part: 0,
    label: 'R1',
    name: 'Right 1',
    hue: 'r1',
    sound: '-',
    knobs: ['Sound', 'Level', 'Pan', 'Reverb', 'Chorus', 'Delay', 'Insert 1', 'Send 4'].map((name, i) => ({
      k: `K${i + 1}`,
      name,
      value: '-',
    })),
  }
  const d = $derived(data ?? EMPTY)
</script>

<div class="panel" role="note" aria-label={`Swap mode for ${d.name}`} style:--part={`var(--${d.hue})`}>
  <div class="head">
    <span class="swap">Swap</span>
    <span class="part">{d.name}</span>
    <span class="page">Panel page</span>
  </div>
  <p class="hint">Hold {d.label}'s button and turn a knob. On screen: long-press {d.label}'s On.</p>
  <div class="knobs">
    {#each d.knobs as w, i (w.k)}
      <div class="knob" class:sound={i === 0}>
        <span class="name">{w.name}</span>
        <span class="value">{w.value}</span>
        <span class="k">{w.k}</span>
      </div>
    {/each}
  </div>
  <div class="foot">
    <LampButton
      label="On"
      hue="lamp"
      on
      width={64}
      name={`${d.name} On, latched in swap mode. Click to let go`}
      tip="part.swap"
      {tipAction}
      ontoggle={() => onrelease?.()}
    />
    <span class="note">Live, commits on release</span>
    <span class="live">Launchkey <span class="line">{d.label}: {d.sound}</span></span>
  </div>
</div>

<style>
  .panel {
    box-sizing: border-box;
    height: 100%;
    padding-left: var(--space-24);
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
  }
  .swap,
  .page {
    font-size: 14px;
    color: var(--m);
  }
  .page {
    margin-left: auto;
    font-size: 13px;
  }
  .part {
    font-size: 14px;
    font-weight: 500;
    color: var(--part);
  }
  .hint {
    flex: none;
    margin: 8px 0 0;
    height: 20px;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 14px;
    line-height: 20px;
    color: var(--t2);
    white-space: nowrap;
  }
  .knobs {
    flex: none;
    margin-top: 12px;
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    grid-auto-rows: 56px;
    gap: 8px 16px;
  }
  .knob {
    min-width: 0;
    box-sizing: border-box;
    border-top: 1px solid var(--line);
    padding-top: 4px;
    display: flex;
    flex-direction: column;
    white-space: nowrap;
  }
  .name,
  .k {
    height: 14px;
    line-height: 14px;
    font-size: 12px;
    color: var(--t2);
  }
  .k {
    color: var(--m);
  }
  .value {
    height: 22px;
    line-height: 22px;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 22px;
    font-weight: 300;
    color: var(--t);
  }
  .sound .value {
    font-size: 16px;
    color: var(--part);
  }
  .foot {
    flex: none;
    margin-top: 14px;
    height: 32px;
    display: flex;
    align-items: center;
    gap: 12px;
    white-space: nowrap;
    min-width: 0;
  }
  .note,
  .live {
    font-size: 13px;
    color: var(--m);
  }
  .live {
    margin-left: auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .line {
    color: var(--t);
  }
</style>
