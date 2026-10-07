<!--
  SectionRow: the toolbar between the app bar and the display (`groups` can draw one group alone,
  and `orientation` vertical makes it a list: the golden Stage's transport block). The transport at the left, in this
  order: Start / Stop (first; the same control as pad 16), Accomp, Sync Start, Reset, Fill ▲,
  Fill ▼ and Fade. The helpers at the right: Metronome joined with its ▾ settings caret, Unison,
  Panic and help mode's ?. With `cells` there is no wrapper: each control is a top-level element
  for its parent's grid to place, one a cell, drawn as outlined faces (see the `cells` prop). The count (bar, beat, sections) lives on the display, not here. Every
  switch is controlled: a press only calls back.

  The controls are in the display's language, at `--tab-block` with no boxes: each switch a dot and a word (the dot filled in the switch's hue
  when on, a hollow muted ring when off; the size of the display's part dots),
  actions plain words, and Start / Stop "● Playing" in the running hue or "○ Stopped". Words
  brighten on hover; names, pressed state, tooltips and the metronome's ▾ stay as they are.
-->
<script lang="ts">
  import type { Action } from 'svelte/action'

  type Props = {
    /** Which groups to draw: both (the section row), the transport alone, or the helpers alone (the golden Stage puts the transport on the display and the helpers in the app bar). */
    groups?: 'all' | 'transport' | 'helpers'
    /** `horizontal`: one row, the screen wide with `groups` all. `vertical`: a list, one control a line (Fill ▲ and Fill ▼ share one), as wide as its words. */
    orientation?: 'horizontal' | 'vertical'
    /**
     * Cells: no wrapper, and the faces are the state language (square, off a 1px outline and the
     * word in the hue, on solid in the hue with --on-ink; no dots). Each control is one top-level
     * element, in order: the transport's Start / Stop (green; its legend the action, "Start /
     * Stop", as on the pads, and the solid fill the playing state), Accomp, Sync Start, Fill (one group, Fill ▲ and Fill ▼ its halves), Fade, Reset
     * (set apart from Fade by a gutter at its cell's left: `--reset-gap`, a fib-13 unless the
     * parent sets it), each filling its parent's cell; the helpers'
     * Metronome with its ▾ (one group, two halves), Unison, ?, then Panic in the warning hue, set
     * apart, each sized to its words and the parent's height (for a max-content column grid).
     * `groups` still picks which; `orientation` is unused. The parent supplies the toolbar role and its name.
     */
    cells?: boolean
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
    groups = 'all',
    orientation = 'horizontal',
    cells = false,
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

  const transport = $derived(groups !== 'helpers')
  const helpers = $derived(groups !== 'transport')
  const vertical = $derived(orientation === 'vertical')
  const toolbarName = $derived(
    groups === 'transport' ? 'Transport' : groups === 'helpers' ? 'Helpers' : 'Transport, switches and helpers',
  )
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

{#snippet startStop()}
  {@render dotSwitch(
    running ? 'Playing' : 'Stopped',
    running,
    'transport.start_stop',
    () => onstartstop?.(),
    `${running ? 'Playing' : 'Stopped'}: Start / Stop (Play). The same control as pad 16`,
    'ok',
  )}
{/snippet}

{#snippet fills()}
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
{/snippet}

{#snippet metronomeWords()}
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
{/snippet}

{#snippet otherHelpers()}
  {@render dotSwitch('Unison', unison, 'transport.unison', () => onunison?.(!unison))}
  {@render action('Panic', '', 'Panic: all notes off', 'transport.panic', onpanic)}
  {@render dotSwitch(
    '?',
    help,
    'app.help',
    () => onhelp?.(!help),
    'Help mode: point at any control to learn what it does',
  )}
{/snippet}

{#snippet face(
  label: string,
  glyph: string,
  on: boolean | undefined,
  tip: string,
  press: () => void,
  name: string | undefined,
  hue: 'neutral' | 'ok' | 'warn',
  kind: string,
)}
  <!-- A cells face in the state language: off a 1px inset outline and the word in the hue, on
       solid in the hue with --on-ink. A switch (`on` set) carries aria-pressed; an action doesn't. -->
  <button
    type="button"
    class="face {kind}"
    data-face={on ? 'on' : 'off'}
    style:--hue="var(--{hue})"
    aria-pressed={on}
    aria-label={name}
    data-tip={tip}
    use:tipOn={tip}
    onclick={press}>{label}{#if glyph}<span class="glyph" aria-hidden="true">{glyph}</span>{/if}</button
  >
{/snippet}

{#if cells}
  <!-- Cells: each control a top-level element, one a cell; the parent is the toolbar. -->
  {#if transport}
    <!-- The legend names the action, as on the pads; the solid fill shows it is playing. -->
    {@render face(
      'Start / Stop',
      '',
      running,
      'transport.start_stop',
      () => onstartstop?.(),
      `${running ? 'Playing' : 'Stopped'}: Start / Stop (Play). The same control as pad 16`,
      'ok',
      'fill',
    )}
    {@render face('Accomp', '', accomp, 'transport.acmp', () => onaccomp?.(!accomp), 'Accomp (ACMP)', 'neutral', 'fill')}
    {@render face(
      'Sync Start',
      '',
      syncStart,
      'transport.sync_start',
      () => onsyncstart?.(!syncStart),
      undefined,
      'neutral',
      'fill',
    )}
    <span class="halves" role="group" aria-label="Fill">
      {@render face(
        'Fill',
        '▲',
        undefined,
        'transport.fill_up',
        () => onfillup?.(),
        'Fill Up: a fill, then the next Main up (at Main D, its own fill)',
        'neutral',
        'half',
      )}
      {@render face(
        'Fill',
        '▼',
        undefined,
        'transport.fill_down',
        () => onfilldown?.(),
        'Fill Down: a fill, then the next Main down (at Main A, its own fill)',
        'neutral',
        'half',
      )}
    </span>
    {@render face('Fade', '', fading, 'transport.fade', () => onfade?.(), 'Fade in/out', 'neutral', 'fill')}
    {@render face(
      'Reset',
      '',
      undefined,
      'transport.section_reset',
      () => onreset?.(),
      'Section reset: restart the section from its first bar',
      'neutral',
      'fill reset',
    )}
  {/if}
  {#if helpers}
    <span class="halves helper" role="group" aria-label="Metronome">
      {@render face('Metronome', '', metronome, 'metronome.on', () => onmetronome?.(!metronome), undefined, 'neutral', 'half word-half')}
      <button
        type="button"
        class="face half caret-half"
        data-face={metronomeOpen ? 'on' : 'off'}
        style:--hue="var(--neutral)"
        aria-haspopup="dialog"
        aria-expanded={metronomeOpen}
        aria-controls={metronomeControls}
        aria-label="Metronome settings: on/off, volume, bell on beat 1"
        data-tip="metronome.settings"
        use:tipOn={'metronome.settings'}
        onclick={() => onmetronomesettings?.()}><span aria-hidden="true">▾</span></button
      >
    </span>
    {@render face('Unison', '', unison, 'transport.unison', () => onunison?.(!unison), undefined, 'neutral', 'helper')}
    {@render face(
      '?',
      '',
      help,
      'app.help',
      () => onhelp?.(!help),
      'Help mode: point at any control to learn what it does',
      'neutral',
      'helper',
    )}
    {@render face('Panic', '', undefined, 'transport.panic', () => onpanic?.(), 'Panic: all notes off', 'warn', 'helper panic')}
  {/if}
{:else}
  <div
    class="row dots"
    class:full={groups === 'all'}
    class:vertical
    role="toolbar"
    aria-label={toolbarName}
    aria-orientation={orientation}
  >
    {#if transport}
    <span class="group" role="group" aria-label="Transport">
      <span class="start-word" class:running>
        {@render startStop()}
      </span>
      {@render dotSwitch('Accomp', accomp, 'transport.acmp', () => onaccomp?.(!accomp), 'Accomp (ACMP)')}
      {@render dotSwitch('Sync Start', syncStart, 'transport.sync_start', () => onsyncstart?.(!syncStart))}
      {@render action('Reset', '', 'Section reset: restart the section from its first bar', 'transport.section_reset', onreset)}
      <span class="pair">
        {@render fills()}
      </span>
      {@render dotSwitch('Fade', fading, 'transport.fade', () => onfade?.(), 'Fade in/out')}
    </span>
    {/if}
    {#if helpers}
    <span class="group helpers">
      <span class="joined-word" role="group" aria-label="Metronome">
        {@render metronomeWords()}
      </span>
      {@render otherHelpers()}
    </span>
    {/if}
  </div>
{/if}

<style>
  /* The display's language. One row at the tab block's height, words in the small text role. */
  .row {
    display: flex;
    align-items: center;
    gap: var(--space-24);
    height: var(--tab-block);
    white-space: nowrap;
  }
  /* Both groups: the screen's width, the helpers pushed to its right end. */
  .row.full {
    width: var(--stage-row-width);
  }
  .group {
    display: flex;
    align-items: center;
    gap: var(--space-24);
  }
  .full .helpers {
    margin-left: auto;
  }
  /* Fill ▲ and Fill ▼: in a row they are two items of the group; in a list they share a line. */
  .pair {
    display: contents;
  }
  /* Vertical: a list, one control a line, every word on the list's left edge. */
  .vertical,
  .vertical .group {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-6);
    height: auto;
  }
  .vertical .pair {
    display: flex;
    gap: var(--space-24);
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
  /* Cells: the owner's state language, square corners. Off: a 1px inset outline and the word in
     the hue (--hue, set per face). On: solid in the hue, the word in --on-ink. */
  .face {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    width: 100%;
    height: 100%;
    min-width: 0;
    margin: 0;
    padding: 0;
    border: 0;
    border-radius: 0;
    background: transparent;
    box-shadow: inset 0 0 0 var(--outline-width) var(--hue);
    color: var(--hue);
    font: var(--type-text);
    letter-spacing: var(--tracking-text);
    white-space: nowrap;
    cursor: pointer;
  }
  .face[data-face='on'] {
    background: var(--hue);
    color: var(--on-ink);
  }
  .face:focus-visible {
    z-index: 1;
    outline: var(--line-width) solid var(--focus);
    outline-offset: var(--focus-offset);
  }
  /* Two buttons as halves of one cell (Fill ▲ | Fill ▼, Metronome | ▾): the second overlaps the
     first by the outline's width, so the cut between them is one line. */
  .halves {
    display: grid;
    grid-template-columns: 1fr 1fr;
    box-sizing: border-box;
    width: 100%;
    height: 100%;
    min-width: 0;
  }
  .halves > .face + .face {
    width: calc(100% + var(--outline-width));
    margin-left: calc(-1 * var(--outline-width));
  }
  /* The helpers size to their words and fill the parent's height (a max-content track's width). */
  .helper {
    padding: 0 var(--space-12);
  }
  .halves.helper {
    grid-template-columns: auto auto;
    padding: 0;
  }
  .word-half {
    padding: 0 var(--space-12);
  }
  .caret-half {
    padding: 0 var(--space-8);
  }
  /* Reset and Panic: last, set apart by a fib-13 gap (a slip onto them is heard). */
  .reset,
  .panic {
    width: calc(100% - var(--fib-13));
    margin-left: var(--fib-13);
  }
  /* Reset's gutter: a fib-13, or the parent's `--reset-gap` (the golden Stage: its cell's golden
     minor part, so Reset keeps one unit behind a golden step). */
  .face.reset {
    width: calc(100% - var(--reset-gap, var(--fib-13)));
    margin-left: var(--reset-gap, var(--fib-13));
  }
</style>
