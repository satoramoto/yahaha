<!--
  SectionRow: the toolbar between the app bar and the display. The transport at the left, in this
  order: Start / Stop (first; the same control as pad 16), Accomp, Sync Start, Reset, Fill ▲,
  Fill ▼ and Fade. The helpers at the right: Metronome joined with its ▾ settings caret, Unison,
  Panic and help mode's ?. The count (bar, beat, sections) lives on the display, not here. Every
  switch is controlled: a press only calls back.

  The controls are in the display's language, at `--tab-block` with no boxes: each switch a dot and a word (the dot filled in the switch's hue
  when on, a hollow muted ring when off; the size of the display's part dots),
  actions plain words, and Start / Stop "● Playing" in the running hue or "○ Stopped". Words
  brighten on hover; names, pressed state, tooltips and the metronome's ▾ stay as they are.
-->
<script lang="ts">
  import type { Action } from 'svelte/action'

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

  function tipOn(node: HTMLElement, key: string) {
    if (!tipAction) return
    return tipAction(node, key)
  }
</script>

{#snippet dotSwitch(
  label: string,
  on: boolean,
  tip: string,
  press: () => void,
  name: string | undefined = undefined,
  hue: 'neutral' | 'ok' = 'neutral',
)}
  <button
    type="button"
    class="word switch"
    class:on
    style:--hue="var(--{hue})"
    aria-pressed={on}
    aria-label={name}
    data-tip={tip}
    use:tipOn={tip}
    onclick={press}><span class="dot" aria-hidden="true"></span>{label}</button
  >
{/snippet}

{#snippet action(label: string, glyph: string, name: string, tip: string, press: (() => void) | undefined)}
  <button type="button" class="word" aria-label={name} data-tip={tip} use:tipOn={tip} onclick={() => press?.()}
    >{label}{#if glyph}<span class="glyph" aria-hidden="true">{glyph}</span>{/if}</button
  >
{/snippet}

  <div class="row dots" role="toolbar" aria-label="Transport, switches and helpers">
    <span class="group" role="group" aria-label="Transport">
      <span class="start-word" class:running>
        {@render dotSwitch(
          running ? 'Playing' : 'Stopped',
          running,
          'transport.start_stop',
          () => onstartstop?.(),
          `${running ? 'Playing' : 'Stopped'}: Start / Stop (Play). The same control as pad 16`,
          'ok',
        )}
      </span>
      {@render dotSwitch('Accomp', accomp, 'transport.acmp', () => onaccomp?.(!accomp), 'Accomp (ACMP)')}
      {@render dotSwitch('Sync Start', syncStart, 'transport.sync_start', () => onsyncstart?.(!syncStart))}
      {@render action('Reset', '', 'Section reset: restart the section from its first bar', 'transport.section_reset', onreset)}
      {@render action(
        'Fill',
        '▲',
        'Fill Up: a fill, then the next Main up (at Main D, its own fill)',
        'transport.fill_up',
        onfillup,
      )}
      {@render action(
        'Fill',
        '▼',
        'Fill Down: a fill, then the next Main down (at Main A, its own fill)',
        'transport.fill_down',
        onfilldown,
      )}
      {@render dotSwitch('Fade', fading, 'transport.fade', () => onfade?.(), 'Fade in/out')}
    </span>
    <span class="group helpers">
      <span class="joined-word" role="group" aria-label="Metronome">
        {@render dotSwitch('Metronome', metronome, 'metronome.on', () => onmetronome?.(!metronome))}
        <button
          type="button"
          class="word caret"
          class:open={metronomeOpen}
          aria-haspopup="dialog"
          aria-expanded={metronomeOpen}
          aria-controls={metronomeControls}
          aria-label="Metronome settings: on/off, volume, bell on beat 1"
          data-tip="metronome.settings"
          use:tipOn={'metronome.settings'}
          onclick={() => onmetronomesettings?.()}><span class="glyph" aria-hidden="true">▾</span></button
        >
      </span>
      {@render dotSwitch('Unison', unison, 'transport.unison', () => onunison?.(!unison))}
      {@render action('Panic', '', 'Panic: all notes off', 'transport.panic', onpanic)}
      {@render dotSwitch(
        '?',
        help,
        'app.help',
        () => onhelp?.(!help),
        'Help mode: point at any control to learn what it does',
      )}
    </span>
  </div>

<style>
  /* The display's language. One row at the tab block's height, words in the small text role. */
  .row {
    display: flex;
    align-items: center;
    gap: var(--space-24);
    width: var(--stage-row-width);
    height: var(--tab-block);
    white-space: nowrap;
  }
  .group {
    display: flex;
    align-items: center;
    gap: var(--space-24);
  }
  .helpers {
    margin-left: auto;
  }
  .word {
    display: flex;
    flex: none;
    align-items: center;
    gap: var(--space-8);
    height: var(--tab-block);
    margin: 0;
    padding: 0;
    border: 0;
    border-radius: var(--radius);
    background: none;
    color: var(--t2);
    font: var(--type-text);
    letter-spacing: var(--tracking-text);
    white-space: nowrap;
    cursor: pointer;
  }
  .word:hover,
  .word.on,
  .word.open {
    color: var(--t);
  }
  .word:focus-visible {
    outline: var(--line-width) solid var(--focus);
    outline-offset: var(--focus-offset);
  }
  .glyph {
    margin-left: var(--space-4);
    font-size: var(--glyph-sm);
  }
  /* A switch's dot, at the display's part-dot size: filled in the hue when on, a hollow muted ring
     when off (the hue's absent strength reads too faint as a 1px ring). */
  .dot {
    flex: none;
    box-sizing: border-box;
    width: var(--beat-dot);
    height: var(--beat-dot);
    border: var(--line-width) solid var(--m);
    border-radius: 50%;
  }
  .on .dot {
    border-color: var(--hue);
    background: var(--hue);
  }
  /* "● Playing" in the running hue. */
  .start-word {
    display: flex;
  }
  .start-word.running .word {
    color: var(--ok);
  }
  .joined-word {
    display: flex;
    align-items: center;
    gap: var(--space-4);
  }
  .caret {
    padding: 0 var(--space-4);
    color: var(--m);
  }
  .caret .glyph {
    margin-left: 0;
  }
</style>
