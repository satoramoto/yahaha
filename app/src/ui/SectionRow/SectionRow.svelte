<!--
  SectionRow: the toolbar between the app bar and the display. The transport at the left, in this
  order: Start / Stop (wider, first; the same control as pad 16, solid green while running),
  Accomp, Sync Start, Reset, Fill ▲, Fill ▼ and Fade. The helpers at the right: Metronome joined
  with its ▾ settings caret, Unison, Panic and help mode's ?. Every control is in the state
  language at `--control-height`: a 1px outline and label in its hue at rest, a solid fill when
  on. The count (bar, beat, sections) lives on the display, not here. Every switch is controlled:
  a press only calls back.
-->
<script lang="ts">
  import type { Action } from 'svelte/action'
  import Button from '../Button/Button.svelte'
  import LampButton from '../LampButton/LampButton.svelte'

  type Props = {
    /** The style is running: Start / Stop is solid green and aria-pressed. */
    running?: boolean
    /** Accompaniment (ACMP) on. */
    accomp?: boolean
    /** Sync Start armed: the style starts with the first chord. */
    syncStart?: boolean
    /** A fade in or out is under way: Fade is lit. */
    fading?: boolean
    /** The metronome on. */
    metronome?: boolean
    /** The metronome's settings popover is open (the caret's ▾ turns `--t`). */
    metronomeOpen?: boolean
    /** The id of the metronome's settings popover, for `aria-controls`. */
    metronomeControls?: string
    /** Unison on. */
    unison?: boolean
    /** Help mode on: the ? is lit. */
    help?: boolean
    /** The app's tooltip action (`use:tip`), applied to every control. */
    tipAction?: Action<HTMLElement, string>
    /** Called when Start / Stop is pressed. */
    onstartstop?: () => void
    /** Called with the state asked for when Accomp is pressed. */
    onaccomp?: (on: boolean) => void
    /** Called with the state asked for when Sync Start is pressed. */
    onsyncstart?: (on: boolean) => void
    /** Called when Reset is pressed (restart the section from its first bar). */
    onreset?: () => void
    /** Called when Fill ▲ is pressed. */
    onfillup?: () => void
    /** Called when Fill ▼ is pressed. */
    onfilldown?: () => void
    /** Called when Fade is pressed. */
    onfade?: () => void
    /** Called with the state asked for when Metronome is pressed. */
    onmetronome?: (on: boolean) => void
    /** Called when the metronome's ▾ caret is pressed (opens or closes its settings). */
    onmetronomesettings?: () => void
    /** Called with the state asked for when Unison is pressed. */
    onunison?: (on: boolean) => void
    /** Called when Panic is pressed (all notes off). */
    onpanic?: () => void
    /** Called with the state asked for when ? is pressed. */
    onhelp?: (on: boolean) => void
  }

  let {
    running = false,
    accomp = false,
    syncStart = false,
    fading = false,
    metronome = false,
    metronomeOpen = false,
    metronomeControls,
    unison = false,
    help = false,
    tipAction,
    onstartstop,
    onaccomp,
    onsyncstart,
    onreset,
    onfillup,
    onfilldown,
    onfade,
    onmetronome,
    onmetronomesettings,
    onunison,
    onpanic,
    onhelp,
  }: Props = $props()
</script>

<div class="row" role="toolbar" aria-label="Transport, switches and helpers">
  <span class="group" role="group" aria-label="Transport">
    <span class="start-stop">
      <LampButton
        label="Start / Stop"
        size="cell"
        hue={running ? 'ok' : 't'}
        on={running}
        name={running ? 'Start / Stop, running (Play). The same control as pad 16' : 'Start / Stop, stopped (Play). The same control as pad 16'}
        tip="transport.start_stop"
        {tipAction}
        ontoggle={() => onstartstop?.()}
      />
    </span>
    <LampButton label="Accomp" name="Accomp (ACMP)" hue="t" on={accomp} tip="transport.acmp" {tipAction} ontoggle={onaccomp} />
    <LampButton label="Sync Start" hue="t" on={syncStart} tip="transport.sync_start" {tipAction} ontoggle={onsyncstart} />
    <Button
      label="Reset"
      name="Section reset: restart the section from its first bar"
      tip="transport.section_reset"
      {tipAction}
      onpress={onreset}
    />
    <Button
      label="Fill"
      symbol="up"
      name="Fill Up: a fill, then the next Main up (at Main D, its own fill)"
      tip="transport.fill_up"
      {tipAction}
      onpress={onfillup}
    />
    <Button
      label="Fill"
      symbol="down"
      name="Fill Down: a fill, then the next Main down (at Main A, its own fill)"
      tip="transport.fill_down"
      {tipAction}
      onpress={onfilldown}
    />
    <Button label="Fade" on={fading} pressed={fading} name="Fade in/out" tip="transport.fade" {tipAction} onpress={onfade} />
  </span>
  <span class="group helpers">
    <span class="joined" role="group" aria-label="Metronome">
      <LampButton
        label="Metronome"
        hue="t"
        on={metronome}
        join="start"
        tip="metronome.on"
        {tipAction}
        ontoggle={onmetronome}
      />
      <Button
        symbol="caret"
        size="caret"
        join="end"
        popup="dialog"
        expanded={metronomeOpen}
        controls={metronomeControls}
        name="Metronome settings: on/off, volume, bell on beat 1"
        tip="metronome.settings"
        {tipAction}
        onpress={onmetronomesettings}
      />
    </span>
    <LampButton label="Unison" hue="t" on={unison} tip="transport.unison" {tipAction} ontoggle={onunison} />
    <Button label="Panic" name="Panic: all notes off" tip="transport.panic" {tipAction} onpress={onpanic} />
    <Button
      label="?"
      size="icon"
      on={help}
      pressed={help}
      name="Help mode: point at any control to learn what it does"
      tip="app.help"
      {tipAction}
      onpress={() => onhelp?.(!help)}
    />
  </span>
</div>

<style>
  .row {
    display: flex;
    align-items: center;
    gap: var(--space-24);
    width: var(--stage-row-width);
    height: var(--control-height);
    white-space: nowrap;
  }
  .group {
    display: flex;
    align-items: center;
    gap: var(--space-8);
  }
  .helpers {
    margin-left: auto;
  }
  .start-stop {
    display: flex;
    flex: none;
    width: var(--start-stop-width);
    height: var(--control-height);
  }
  .joined {
    display: flex;
    gap: var(--line-width);
  }
</style>
