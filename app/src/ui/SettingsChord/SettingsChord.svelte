<!--
  SettingsChord: the Chord & Split page of the Settings screen, below the page header the Screen
  draws. Three columns (Fingering | Left hand | Split point and who plays where) over the page
  keyboard at the page's full width. Fingering is a radiogroup list, the chosen type a solid
  `--neutral` block; the left hand's switches are lamps in settings rows; the split point steps with
  − and +, resets to its default, and moves with the white line on the keyboard (drag it, or focus
  it and use the arrows). Off parts in Who plays where are drawn in their hue at absent strength.
  Controlled: it never changes `data`, it reports each change through `onchange`.
-->
<script lang="ts">
  import type { Action } from 'svelte/action'
  import Button from '../Button/Button.svelte'
  import GroupHeader from '../GroupHeader/GroupHeader.svelte'
  import Keys from '../Keys/Keys.svelte'
  import { isBlack, layout } from '../Keys/keys'
  import LampButton from '../LampButton/LampButton.svelte'
  import LineSlider from '../LineSlider/LineSlider.svelte'
  import SettingsRow from '../SettingsRow/SettingsRow.svelte'
  import Stepper from '../Stepper/Stepper.svelte'
  import type { ChordChange, ChordPageData } from '../Settings/types'

  type Props = {
    /** Everything the page shows. */
    data: ChordPageData
    /** The app's `use:tip` action, passed in by the wiring; applied to every control with a tooltip key. */
    tipAction?: Action<HTMLElement, string>
    /** Called with each change asked for; the page itself changes nothing. */
    onchange?: (change: ChordChange) => void
  }

  let { data, tipAction, onchange }: Props = $props()

  /** The page keyboard's width when it can't be measured (jsdom, first paint): the page's 1048. */
  const KEYS_FALLBACK_WIDTH = 1048

  let keysBox = $state(0)
  const keysWidth = $derived(keysBox > 0 ? keysBox : KEYS_FALLBACK_WIDTH)
  const range = $derived({ low: data.keysLow, high: data.keysHigh })
  const keys = $derived(layout(range, Math.max(0, keysWidth - 2), data.split, [], [], 'r1'))
  const radios: HTMLButtonElement[] = $state([])

  /** Applies the parent's tooltip action when both it and a key are given. */
  const tipped: Action<HTMLElement, string | undefined> = (node, key) => {
    if (!tipAction || key === undefined) return
    const handle = tipAction(node, key)
    return {
      update: (next) => {
        if (next !== undefined) handle?.update?.(next)
      },
      destroy: () => handle?.destroy?.(),
    }
  }

  /** Follows the strip's width, where the browser can watch it (jsdom can't: the fallback width stays). */
  const measure: Action<HTMLElement> = (node) => {
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => (keysBox = node.clientWidth))
    observer.observe(node)
    keysBox = node.clientWidth
    return { destroy: () => observer.disconnect() }
  }

  const send = (change: ChordChange) => onchange?.(change)

  function fingeringKey(event: KeyboardEvent, index: number) {
    const count = data.fingerings.length
    const to: Record<string, number> = {
      ArrowDown: index + 1,
      ArrowRight: index + 1,
      ArrowUp: index - 1,
      ArrowLeft: index - 1,
      Home: 0,
      End: count - 1,
    }
    if (!(event.key in to) || count === 0) return
    event.preventDefault()
    const target = (to[event.key] + count) % count
    radios[target]?.focus()
    if (data.fingerings[target].id !== data.fingering) send({ type: 'fingering', id: data.fingerings[target].id })
  }

  /** Asks for a split note, clamped to the range; nothing when it is already there. */
  function askSplit(note: number) {
    const next = Math.max(data.splitMin, Math.min(data.splitMax, Math.round(note)))
    if (next !== data.split) send({ type: 'split', note: next })
  }

  function splitKey(event: KeyboardEvent) {
    const to: Record<string, number> = {
      ArrowRight: data.split + 1,
      ArrowUp: data.split + 1,
      ArrowLeft: data.split - 1,
      ArrowDown: data.split - 1,
      Home: data.splitMin,
      End: data.splitMax,
    }
    if (!(event.key in to)) return
    event.preventDefault()
    askSplit(to[event.key])
  }

  // The split line drag: the key under the pointer becomes the left zone's highest note.
  let strip: HTMLDivElement | undefined = $state()
  let dragging: number | null = null

  function noteAt(clientX: number): number | null {
    const box = strip?.getBoundingClientRect()
    if (!box || keys.whiteWidth <= 0 || keys.whites.length === 0) return null
    const x = clientX - box.left
    const index = Math.max(0, Math.min(keys.whites.length - 1, Math.floor(x / keys.whiteWidth)))
    const white = keys.whites[index].note
    const within = x / keys.whiteWidth - index
    if (within > 2 / 3 && white + 1 <= data.keysHigh && isBlack(white + 1)) return white + 1
    if (within < 1 / 3 && white - 1 >= data.keysLow && isBlack(white - 1)) return white - 1
    return white
  }

  function dragTo(event: PointerEvent) {
    const note = noteAt(event.clientX)
    if (note !== null) askSplit(note)
  }

  function pointerDown(event: PointerEvent) {
    if (event.button !== 0) return
    dragging = event.pointerId
    try {
      ;(event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId)
    } catch {
      // jsdom and synthetic events have no pointer capture.
    }
  }

  function pointerMove(event: PointerEvent) {
    if (dragging === event.pointerId) dragTo(event)
  }

  function pointerEnd(event: PointerEvent) {
    if (dragging === event.pointerId) dragging = null
  }
</script>

<div class="page">
  <div class="columns">
    <section class="group" aria-labelledby="chord-fingering">
      <GroupHeader title="Fingering" level={3} id="chord-fingering" />
      <div class="fingerings" role="radiogroup" aria-labelledby="chord-fingering">
        {#each data.fingerings as item, i (item.id)}
          {@const chosen = item.id === data.fingering}
          <button
            type="button"
            class="fingering"
            class:chosen
            role="radio"
            aria-checked={chosen}
            tabindex={chosen || (i === 0 && !data.fingerings.some((f) => f.id === data.fingering)) ? 0 : -1}
            data-tip={item.tip}
            bind:this={radios[i]}
            use:tipped={item.tip}
            onclick={() => {
              if (!chosen) send({ type: 'fingering', id: item.id })
            }}
            onkeydown={(e) => fingeringKey(e, i)}
          >
            <span class="name">{item.label}</span>
            <span class="line">{item.line}</span>
          </button>
        {/each}
      </div>
    </section>

    <section class="group" aria-labelledby="chord-left-hand">
      <GroupHeader title="Left hand" level={3} id="chord-left-hand" />
      <SettingsRow label="Upper" hint="Chords from the right hand">
        <LampButton
          label={data.upper ? 'On' : 'Off'}
          on={data.upper}
          size="sm"
          width={64}
          name="Upper: read chords right of the split"
          tip="detection.upper"
          {tipAction}
          ontoggle={(on) => send({ type: 'upper', on })}
        />
      </SettingsRow>
      <SettingsRow label="Manual Bass" hint="Works with Upper on">
        <LampButton
          label={data.manualBass ? 'On' : 'Off'}
          on={data.manualBass}
          disabled={!data.upper}
          size="sm"
          width={64}
          name="Manual Bass, works with Upper on"
          tip="detection.manual_bass"
          {tipAction}
          ontoggle={(on) => send({ type: 'manualBass', on })}
        />
      </SettingsRow>
      <SettingsRow label="Left Hold" hint="Fader button 7">
        <LampButton
          label={data.leftHold ? 'On' : 'Off'}
          on={data.leftHold}
          size="sm"
          width={64}
          name="Left Hold: the chord holds when you lift"
          tip="detection.left_hold"
          {tipAction}
          ontoggle={(on) => send({ type: 'leftHold', on })}
        />
      </SettingsRow>
      <SettingsRow label="Chord settle">
        <LineSlider
          value={data.settleMs}
          min={0}
          max={data.settleMax}
          name="Chord settle window"
          unit="ms"
          tip="settings.chord_settle"
          {tipAction}
          onchange={(ms) => send({ type: 'settle', ms })}
        />
      </SettingsRow>
      <p class="help">
        How long yahaha waits for the rest of a chord before it changes. Longer is steadier, shorter is quicker. 0 to
        {data.settleMax} ms.
      </p>
    </section>

    <section class="group" aria-labelledby="chord-split">
      <GroupHeader title="Split point" level={3} id="chord-split">
        {#snippet end()}
          {#if data.splitLocked}<span class="locked">Locked</span>{/if}
        {/snippet}
      </GroupHeader>
      <div class="split-value">
        <Stepper
          value={data.splitName}
          unit={`MIDI ${data.split}`}
          size="large"
          nameDown="Split point one key down"
          nameUp="Split point one key up"
          tipDown="split.down"
          tipUp="split.up"
          atMin={data.split <= data.splitMin}
          atMax={data.split >= data.splitMax}
          {tipAction}
          ondown={() => send({ type: 'splitStep', delta: -1 })}
          onup={() => send({ type: 'splitStep', delta: 1 })}
        />
      </div>
      <div class="split-actions">
        <Button
          label={`Reset to ${data.splitDefaultName}`}
          disabled={data.split === data.splitDefault}
          tip="settings.split_reset"
          {tipAction}
          onpress={() => send({ type: 'splitReset' })}
        />
        {#if data.splitLocked}
          <Button
            label={`A rack keeps ${data.splitName} · Keyboard page`}
            name={`Split point is locked: a rack keeps ${data.splitName}. Opens the Keyboard page`}
            tip="settings.split_lock_link"
            {tipAction}
            onpress={() => send({ type: 'openKeyboard' })}
          />
        {/if}
      </div>
      <h4 class="subhead">Who plays where</h4>
      <div class="zones">
        {#each data.zones as zone (zone.part)}
          <div class="zone" class:off={!zone.on} data-hue={zone.hue}>
            <span class="side">{zone.side ?? ''}</span>
            <span class="tag">{zone.part}</span>
            <span class="program">{zone.program}</span>
            <span class="sound">{zone.sound}</span>
            <span class="state">{zone.state}</span>
          </div>
        {/each}
      </div>
    </section>
  </div>

  <section class="keyboard" aria-labelledby="chord-keys">
    <GroupHeader title="On the keys" level={3} id="chord-keys">
      <span class="caption">Chords read {data.upper ? 'right' : 'left'} of the split</span>
      {#snippet end()}
        <span class="caption">Drag the white line to move the split</span>
      {/snippet}
    </GroupHeader>
    <div class="strip" bind:this={strip} use:measure>
      <Keys {range} split={data.split} width={keysWidth} />
      {#if keys.splitX !== null}
        <span
          class="handle"
          role="slider"
          tabindex="0"
          style:left="{keys.splitX}px"
          aria-label="Split line: drag to move"
          aria-valuemin={data.splitMin}
          aria-valuemax={data.splitMax}
          aria-valuenow={data.split}
          aria-valuetext={data.splitName}
          data-tip="settings.split_strip"
          use:tipped={'settings.split_strip'}
          onkeydown={splitKey}
          onpointerdown={pointerDown}
          onpointermove={pointerMove}
          onpointerup={pointerEnd}
          onpointercancel={pointerEnd}
        >
          <span class="grip"></span>
        </span>
      {/if}
    </div>
  </section>
</div>

<style>
  .page {
    /* The page area's sizes, which the scale lacks: the three columns and the split handle. */
    --chord-col-fingering: 280px;
    --chord-col-left: 384px;
    --chord-fingering-height: 44px;
    --chord-handle-width: 16px;
    --chord-grip-width: 6px;
    --chord-grip-height: 12px;
    --chord-zone-side: 48px;
    --chord-zone-tag: 28px;
    --chord-zone-program: 24px;
    display: flex;
    flex-direction: column;
    gap: var(--space-24);
    box-sizing: border-box;
    width: 100%;
    color: var(--value-ink);
    font: var(--type-text);
    letter-spacing: var(--tracking-text);
    font-variant-numeric: tabular-nums;
  }
  .columns {
    display: grid;
    grid-template-columns: var(--chord-col-fingering) var(--chord-col-left) minmax(0, 1fr);
    column-gap: var(--space-24);
    align-items: start;
  }
  .group {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  /* Fingering: a list of two-line rows; the chosen one a solid neutral block. */
  .fingerings {
    display: flex;
    flex-direction: column;
  }
  .fingering {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: var(--space-2);
    box-sizing: border-box;
    width: 100%;
    height: var(--chord-fingering-height);
    margin: 0;
    padding: 0 var(--space-10);
    border: 0;
    border-bottom: var(--line-width) solid var(--line);
    border-radius: var(--radius);
    background: transparent;
    text-align: left;
    white-space: nowrap;
    cursor: pointer;
  }
  .fingering .name {
    color: var(--value-ink);
    font: var(--type-strong);
    letter-spacing: var(--tracking-strong);
  }
  .fingering .line {
    overflow: hidden;
    color: var(--caption-ink);
    font: var(--type-text);
    letter-spacing: var(--tracking-text);
    text-overflow: ellipsis;
  }
  .fingering.chosen {
    background: var(--neutral);
  }
  .chosen .name,
  .chosen .line {
    color: var(--on-ink);
  }
  .fingering:focus-visible {
    outline: var(--line-width) solid var(--focus);
    outline-offset: calc(-1 * var(--focus-offset));
  }

  .help {
    margin: var(--space-12) 0 0;
    color: var(--caption-ink);
  }

  /* Split point. */
  .locked {
    color: var(--value-ink);
    font: var(--type-strong);
    letter-spacing: var(--tracking-strong);
  }
  .split-value {
    padding: var(--space-12) 0 var(--space-8);
  }
  .split-actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-8);
  }
  .subhead {
    margin: var(--space-20) 0 0;
    padding-bottom: var(--space-6);
    border-bottom: var(--line-width) solid var(--line);
    color: var(--header-ink);
    font: var(--type-strong);
    letter-spacing: var(--tracking-strong);
  }
  .zone {
    --zone-hue: var(--neutral);
    display: grid;
    grid-template-columns: var(--chord-zone-side) var(--chord-zone-tag) var(--chord-zone-program) minmax(0, 1fr) auto;
    align-items: center;
    column-gap: var(--space-8);
    min-height: var(--control-height-compact);
    border-bottom: var(--line-width) solid var(--line);
    white-space: nowrap;
  }
  .zone[data-hue='r1'] {
    --zone-hue: var(--r1);
  }
  .zone[data-hue='r2'] {
    --zone-hue: var(--r2);
  }
  .zone[data-hue='r3'] {
    --zone-hue: var(--r3);
  }
  .zone[data-hue='l'] {
    --zone-hue: var(--l);
  }
  .zone.off[data-hue='r1'] {
    --zone-hue: var(--absent-r1);
  }
  .zone.off[data-hue='r2'] {
    --zone-hue: var(--absent-r2);
  }
  .zone.off[data-hue='r3'] {
    --zone-hue: var(--absent-r3);
  }
  .zone.off[data-hue='l'] {
    --zone-hue: var(--absent-l);
  }
  .side,
  .program,
  .state {
    color: var(--caption-ink);
  }
  .tag {
    color: var(--zone-hue);
    font: var(--type-strong);
    letter-spacing: var(--tracking-strong);
  }
  .sound {
    overflow: hidden;
    color: var(--value-ink);
    text-overflow: ellipsis;
  }
  .off .sound,
  .off .program,
  .off .state {
    color: var(--absent-neutral);
  }

  /* The page keyboard and its split handle. */
  .caption {
    color: var(--caption-ink);
    font: var(--type-text);
    letter-spacing: var(--tracking-text);
  }
  .strip {
    position: relative;
    width: 100%;
    margin-top: var(--space-12);
  }
  .handle {
    position: absolute;
    top: 0;
    bottom: 0;
    width: var(--chord-handle-width);
    margin-left: calc(var(--chord-handle-width) / -2);
    cursor: ew-resize;
    touch-action: none;
  }
  .handle:focus-visible {
    outline: var(--line-width) solid var(--focus);
    outline-offset: var(--focus-offset);
  }
  .grip {
    position: absolute;
    top: 50%;
    left: 50%;
    width: var(--chord-grip-width);
    height: var(--chord-grip-height);
    background: var(--t);
    transform: translate(-50%, -50%);
  }
</style>
