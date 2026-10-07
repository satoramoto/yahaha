<!--
  MetronomePopover: the metronome's settings, opened by the section row's Metronome ▾ caret. A small
  box on the ground with a 1px hairline outline: the title "Metronome", then three settings rows
  (SettingsRow): Metronome on/off and Bell on beat 1 as On/Off lamps, Volume as a LineSlider (0–127).
  When the click can't sound (the built-in synth isn't running) a caption says so. Controlled: every
  change is a callback; it holds no state. Esc, or a press outside it (except on the control that
  opens it, `[aria-controls=<id>]`, which toggles it itself), calls `onclose`. Where it sits is the
  parent's: it draws in place.
-->
<script lang="ts">
  import type { Action } from 'svelte/action'
  import LampButton from '../LampButton/LampButton.svelte'
  import LineSlider from '../LineSlider/LineSlider.svelte'
  import SettingsRow from '../SettingsRow/SettingsRow.svelte'

  type Props = {
    /** The popover's id: the opener's `aria-controls` names it. */
    id?: string
    /** The metronome on. */
    on?: boolean
    /** The click's volume, 0–127. */
    volume?: number
    /** A bell on the first beat of each bar. */
    bell?: boolean
    /** The click can sound (the built-in synth is running); false shows a caption saying it can't. */
    audible?: boolean
    /** The app's tooltip action (`use:tip`), applied to every control. */
    tipAction?: Action<HTMLElement, string>
    /** Called with the state asked for when the metronome's On/Off is pressed. */
    onon?: (on: boolean) => void
    /** Called with the volume asked for (0–127). */
    onvolume?: (volume: number) => void
    /** Called with the state asked for when the bell's On/Off is pressed. */
    onbell?: (on: boolean) => void
    /** Called on Esc or a press outside the popover (not on its opener). */
    onclose?: () => void
  }

  let {
    id = 'metronome-settings',
    on = false,
    volume = 100,
    bell = false,
    audible = true,
    tipAction,
    onon,
    onvolume,
    onbell,
    onclose,
  }: Props = $props()

  let box: HTMLDivElement | undefined = $state()

  // Esc and a press outside close it. A press on the opener is left to the opener (it toggles).
  $effect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onclose?.()
    }
    const pointerdown = (event: PointerEvent) => {
      const target = event.target as Node | null
      if (!target || !box || box.contains(target)) return
      if (target instanceof Element && target.closest(`[aria-controls="${id}"]`)) return
      onclose?.()
    }
    window.addEventListener('keydown', keydown)
    window.addEventListener('pointerdown', pointerdown, true)
    return () => {
      window.removeEventListener('keydown', keydown)
      window.removeEventListener('pointerdown', pointerdown, true)
    }
  })
</script>

<div class="popover" {id} role="dialog" aria-label="Metronome settings" bind:this={box}>
  <span class="title">Metronome</span>
  <SettingsRow label="On/off" labelWidth={96}>
    <LampButton
      label={on ? 'On' : 'Off'}
      {on}
      size="sm"
      width={64}
      name="Metronome on/off"
      tip="metronome.on"
      {tipAction}
      ontoggle={(next) => onon?.(next)}
    />
  </SettingsRow>
  <SettingsRow label="Volume" labelWidth={96}>
    <LineSlider
      value={volume}
      min={0}
      max={127}
      name="Metronome volume"
      width={120}
      tip="metronome.volume"
      {tipAction}
      onchange={(v) => onvolume?.(v)}
    />
  </SettingsRow>
  <SettingsRow label="Bell on beat 1" labelWidth={96}>
    <LampButton
      label={bell ? 'On' : 'Off'}
      on={bell}
      size="sm"
      width={64}
      name="Bell on beat 1"
      tip="metronome.bell"
      {tipAction}
      ontoggle={(next) => onbell?.(next)}
    />
  </SettingsRow>
  {#if !audible}
    <span class="note">The built-in synth isn't running: the click can't sound.</span>
  {/if}
</div>

<style>
  .popover {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    box-sizing: border-box;
    width: max-content;
    padding: var(--space-12) var(--space-16) var(--space-16);
    border-radius: var(--radius);
    background: var(--g);
    box-shadow: inset 0 0 0 var(--outline-width) var(--line);
    color: var(--t);
    font: var(--type-text);
    letter-spacing: var(--tracking-text);
  }
  .title {
    color: var(--header-ink);
    font: var(--type-strong);
    letter-spacing: var(--tracking-strong);
  }
  .note {
    max-width: 300px;
    color: var(--caption-ink);
    white-space: normal;
  }
</style>
