<!--
  NowPlaying: the display's middle, in glance order. The chord on the left; on the right the
  playing section in its hue and the next section muted, both hero values at display size, with
  "next" and when the fill lands in text on their baseline; under them the bar and beat with the
  section's bar lines; then the tempo line: the tempo, Tempo − and + (repeat while held) and Style
  tempo beside it, and the Running light at the right end. Every line uses one type size apart from
  its hero values, and the tempo line's controls share the one control height. Holds no state and
  no timers: the parent repeats Tempo ± between the two `onhold` calls.
-->
<script lang="ts">
  import type { ComponentProps } from 'svelte'
  import type { Action } from 'svelte/action'
  import BarBeat from '../BarBeat/BarBeat.svelte'
  import Button from '../Button/Button.svelte'
  import ChordReadout from '../ChordReadout/ChordReadout.svelte'
  import SectionName from '../SectionName/SectionName.svelte'
  import StatusDot from '../StatusDot/StatusDot.svelte'
  import TempoReadout from '../TempoReadout/TempoReadout.svelte'

  type Hue = 'intro' | 'main' | 'ending' | 'brk' | 'fill'

  type Props = {
    /** The chord readout: chord, extension, notes, fingering, held. */
    chord: ComponentProps<typeof ChordReadout>
    /** The playing section's shown name ("Main B"). */
    playing: string
    /** The playing section's hue (its name, the dot by "Section", the current beat and bar). */
    hue?: Hue
    /** The next section's shown name ("Main C"). Empty: no "next". */
    next?: string
    /** When the fill lands ("fill lands after bar 4"). Empty: nothing. Ellipsized first when the line is too long. */
    fill?: string
    /** The current bar of the section, 1-based. */
    bar: number
    /** Bars in the section. */
    bars: number
    /** The current beat, 1-based; 0 when stopped. */
    beat?: number
    /** Beats in the bar. */
    beats?: number
    /** How far through the current bar, 0-1. Default: halfway through the current beat. */
    progress?: number
    /** The tempo in BPM. */
    bpm: number
    /** The style is running: the green "Running" light. False: a hollow dot and "Stopped". */
    running?: boolean
    /** The app's tooltip action (`use:tip`), applied to the tempo buttons. */
    tipAction?: Action<HTMLElement, string>
    /** Tempo + held (`true`) and released (`false`); from the keyboard, a press calls with `true` then `false`. */
    ontempoup?: (down: boolean) => void
    /** Tempo − held and released, as `ontempoup`. */
    ontempodown?: (down: boolean) => void
    /** Style tempo pressed: back to the style's own tempo. */
    onstyletempo?: () => void
  }

  let {
    chord,
    playing,
    hue = 'main',
    next = '',
    fill = '',
    bar,
    bars,
    beat = 0,
    beats = 4,
    progress,
    bpm,
    running = false,
    tipAction,
    ontempoup,
    ontempodown,
    onstyletempo,
  }: Props = $props()

  const hasNext = $derived(next.trim() !== '')

  /** A keyboard press on a hold button: one step, as a hold that ends at once. */
  const tap = (fn?: (down: boolean) => void) => () => {
    fn?.(true)
    fn?.(false)
  }
</script>

<div class="now">
  <ChordReadout {...chord} />
  <div class="column" role="group" aria-label="Section">
    <span class="label"><StatusDot {hue} visible={running} />Section</span>
    <div class="sections">
      <span class="playing"><SectionName label={playing} {hue} idle={!running} /></span>
      {#if hasNext}
        <span class="word">next</span>
        <span class="next">{next}</span>
      {/if}
      {#if fill}<span class="fill">{fill}</span>{/if}
    </div>
    <div class="count"><BarBeat {bar} {bars} {beat} {beats} {hue} {progress} /></div>
    <div class="tempo">
      <TempoReadout {bpm} />
      <span class="controls" role="group" aria-label="Tempo">
        <Button
          label=""
          symbol="minus"
          size="icon"
          hold
          name="Tempo down (Function)"
          tip="tempo.down"
          {tipAction}
          onhold={ontempodown}
          onpress={tap(ontempodown)}
        />
        <Button
          label=""
          symbol="plus"
          size="icon"
          hold
          name="Tempo up (Scene Launch)"
          tip="tempo.up"
          {tipAction}
          onhold={ontempoup}
          onpress={tap(ontempoup)}
        />
        <Button
          label="Style tempo"
          size="md"
          name="Style tempo: back to the tempo the style came with (Scene Launch and Function together)"
          tip="tempo.reset"
          {tipAction}
          onpress={onstyletempo}
        />
      </span>
      <span class="state" class:running role="status">
        <StatusDot hue={running ? 'ok' : 'd'} hollow={!running} />{running ? 'Running' : 'Stopped'}
      </span>
    </div>
  </div>
</div>

<style>
  .now {
    display: grid;
    grid-template-columns: var(--now-chord-width) var(--now-section-width);
    gap: var(--space-24);
    width: var(--display-content-width);
    height: var(--now-height);
    font-family: var(--font-sans);
  }
  .column {
    min-width: 0;
    display: flex;
    flex-direction: column;
  }
  .label {
    height: var(--label-height);
    display: flex;
    align-items: center;
    gap: var(--space-8);
    font: var(--type-text);
    letter-spacing: var(--tracking-text);
    color: var(--caption-ink);
  }
  /* The sections line: the playing and next section at display size, "next" and the fill in text,
     all on one baseline. When it runs long the fill text ellipsizes first. */
  .sections {
    margin-top: var(--space-4);
    height: var(--chip-height-display);
    display: flex;
    align-items: baseline;
    gap: var(--space-16);
    min-width: 0;
    white-space: nowrap;
  }
  .playing {
    display: flex;
    flex: none;
  }
  .word {
    flex: none;
    font: var(--type-text);
    letter-spacing: var(--tracking-text);
    color: var(--caption-ink);
  }
  .next {
    flex: 0 0 auto;
    font: var(--type-display);
    letter-spacing: var(--tracking-display);
    color: var(--m);
  }
  .fill {
    flex: 0 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    font: var(--type-text);
    letter-spacing: var(--tracking-text);
    color: var(--m);
  }
  .count {
    margin-top: var(--bar-row-gap);
  }
  /* The tempo line is the readout's 40px line; the buttons, one control height, centred on it. */
  .tempo {
    margin-top: var(--tempo-gap);
    display: flex;
    align-items: baseline;
    gap: var(--space-16);
    white-space: nowrap;
  }
  .controls {
    align-self: center;
    display: flex;
    align-items: center;
    gap: var(--space-8);
    height: var(--control-height);
  }
  .state {
    margin-left: auto;
    align-self: center;
    display: flex;
    align-items: center;
    gap: var(--space-8);
    font: var(--type-text);
    letter-spacing: var(--tracking-text);
    color: var(--m);
  }
  .state.running {
    color: var(--ok);
  }
</style>
