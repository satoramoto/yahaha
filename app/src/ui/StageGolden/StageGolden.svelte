<!--
  StageGolden: the Stage at 1440 × 900 laid out by golden subdivision (a proposal; Stage renders it
  with `layout="golden"`, Storybook only for now). The same regions and data as Stage, placed on
  the cuts in tokens/stage-golden.css:
  - the app bar (y 20–56), carrying the helpers (Metronome ▾, Unison, Panic, ?) at its right end;
  - the golden frame, 1217 × 752: the display row on top (chord, song, transport, One Touch,
    parts; 287 + 287 + 178 + 178 + 287) with the beat bar under all five, ¾ of the way down; the
    band below (faders 752 × 465; the 465 square cut into knobs 178 and pads 287, a 4 × 4 grid);
  - the keys (y 824–880).
  Every block is absolutely placed on its rectangle and keeps its own inner padding
  (--golden-pad), so block edges sit exactly on the cut lines. The status line sits at the foot
  of the faders block. It changes no component: it sets the components' size tokens for its
  subtree and uses their additive props (SectionRow `groups` and `orientation`, OneTouchPicker
  `orientation`, SoundRow `showOneTouch`, PadBank `columns`, AppBar `end`).
-->
<script lang="ts">
  import type { ComponentProps } from 'svelte'
  import AppBar from '../AppBar/AppBar.svelte'
  import BarBeat from '../BarBeat/BarBeat.svelte'
  import ChordReadout from '../ChordReadout/ChordReadout.svelte'
  import FaderBank from '../FaderBank/FaderBank.svelte'
  import Keys from '../Keys/Keys.svelte'
  import KnobBank from '../KnobBank/KnobBank.svelte'
  import NowPlaying from '../NowPlaying/NowPlaying.svelte'
  import OneTouchPicker from '../OneTouchPicker/OneTouchPicker.svelte'
  import PadBank from '../PadBank/PadBank.svelte'
  import SectionRow from '../SectionRow/SectionRow.svelte'
  import SoundRow from '../SoundRow/SoundRow.svelte'
  import type Stage from '../Stage/Stage.svelte'
  import StatusLine from '../StatusLine/StatusLine.svelte'
  import StyleLine from '../StyleLine/StyleLine.svelte'

  /** The Stage's props (the same regions and callbacks), with the running and fading Stage resolved. */
  type Props = ComponentProps<typeof Stage> & {
    /** The style is running (Stage resolves it from the section row or the old transport). */
    running?: boolean
    /** A fade is under way (as `running`). */
    fading?: boolean
  }

  let p: Props = $props()

  /** The frame's width in px, for the keys' and the app bar's `width` (tokens/stage-golden.css, --golden-width). */
  const KEYS_WIDTH = 1217
  const APP_BAR_WIDTH = 1217

  const display = $derived(p.display)
  const style = $derived({
    styleName: display.styleLine.styleName,
    category: display.styleLine.category,
    timeSignature: display.styleLine.timeSignature,
    queued: display.styleLine.queued,
  })
  const song = $derived({
    playing: display.nowPlaying.playing,
    hue: display.nowPlaying.hue,
    next: display.nowPlaying.next,
    fill: display.nowPlaying.fill,
    bar: display.nowPlaying.bar,
    bars: display.nowPlaying.bars,
    bpm: display.nowPlaying.bpm,
    running: display.nowPlaying.running,
    syncStart: display.nowPlaying.syncStart,
  })
</script>

<div class="screen">
  <div class="bar">
    <AppBar {...p.appBar} width={APP_BAR_WIDTH} tipAction={p.tipAction} onchoose={p.onchoose} onhealth={p.onhealth}>
      {#snippet end()}
        <SectionRow
          {...p.sectionRow}
          groups="helpers"
          orientation="horizontal"
          running={p.running}
          fading={p.fading}
          tipAction={p.tipAction}
          onmetronome={p.onmetronome}
          onmetronomesettings={p.onmetronomesettings}
          onunison={p.onunison}
          onpanic={p.onpanic}
          onhelp={p.onhelp}
        />
      {/snippet}
    </AppBar>
  </div>

  <section class="display" aria-label="Stage display">
    <div class="block chord">
      <StyleLine {...style} tipAction={p.tipAction} onprev={p.onprev} onnext={p.onnext} onbrowse={p.onbrowse} />
      <div class="hero"><ChordReadout {...display.nowPlaying.chord} /></div>
    </div>
    <div class="block song">
      <NowPlaying
        {...song}
        tipAction={p.tipAction}
        ontempoup={p.ontempoup}
        ontempodown={p.ontempodown}
        onstyletempo={p.onstyletempo}
        ontempo={p.ontempo}
      />
    </div>
    <div class="block transport">
      <SectionRow
        {...p.sectionRow}
        groups="transport"
        orientation="vertical"
        running={p.running}
        fading={p.fading}
        tipAction={p.tipAction}
        onstartstop={p.onstartstop}
        onaccomp={p.onaccomp}
        onsyncstart={p.onsyncstart}
        onreset={p.onreset}
        onfillup={p.onfillup}
        onfilldown={p.onfilldown}
        onfade={p.onfade}
      />
    </div>
    <div class="block ots">
      <OneTouchPicker
        orientation="vertical"
        applied={display.styleLine.oneTouch ?? 0}
        count={display.styleLine.oneTouchCount ?? 4}
        tipAction={p.tipAction}
        onapply={p.ononetouch}
      />
    </div>
    <div class="block parts">
      <SoundRow parts={display.soundRow.parts} showOneTouch={false} tipAction={p.tipAction} onsound={p.onsound} />
    </div>
    <div class="beat">
      <BarBeat
        beat={display.nowPlaying.running ? (display.nowPlaying.beat ?? 0) : 0}
        beats={display.nowPlaying.beats ?? 4}
        hue={display.nowPlaying.hue}
      />
    </div>
  </section>

  <div class="block faders">
    <FaderBank
      {...p.faders}
      tipAction={p.tipAction}
      onchoosePage={p.onchoosePage}
      onchooseLayer={p.onchooseLayer}
      onlevel={p.onlevel}
      onopen={p.onopen}
      onlamp={p.onlamp}
      onlamplong={p.onlamplong}
      onlamprelease={p.onlamprelease}
      onpagebutton={p.onpagebutton}
    />
    <div class="status">
      <StatusLine {...p.status} tipAction={p.tipAction} onclear={p.onclear} />
    </div>
  </div>
  <div class="block knobs">
    <KnobBank {...p.knobs} tipAction={p.tipAction} onpage={p.onknobpage} onpress={p.onknobpress} onstep={p.onstep} />
  </div>
  <div class="block pads">
    <PadBank {...p.pads} columns={4} tipAction={p.tipAction} onbank={p.onpadbank} onpress={p.onpadpress} />
  </div>
  <div class="keys">
    <Keys {...p.keys} width={KEYS_WIDTH} />
  </div>
</div>

<style>
  .screen {
    position: relative;
    box-sizing: border-box;
    width: var(--screen-width);
    height: var(--screen-height);
    overflow: hidden;
    background: var(--g);
    color: var(--t);
    font-family: var(--font-sans);

    /* The components' size tokens, set for this subtree only (tokens/stage-golden.css has the cuts). */
    /* The display's parts measure against the frame's width, inset by one block padding. */
    --stage-row-width: var(--golden-width);
    --display-border-width: 0px;
    --display-pad-left: var(--golden-pad);
    /* Faders: the block inside its padding, less the status line and a padding's gap above it;
       the strips take every px the header, captions and lamps leave. */
    --band-faders-width: calc(var(--golden-faders-width) - 2 * var(--golden-pad));
    --band-height: calc(var(--golden-band-height) - 3 * var(--golden-pad) - var(--space-20));
    --fader-strip-height: calc(
      var(--band-height) - var(--group-header-height) - var(--band-body-gap) - var(--band-caption-gap) -
        var(--band-caption-height) - var(--band-lamp-gap) - var(--control-height)
    );
    --fader-height: calc(var(--fader-strip-height) - var(--fader-name-height));
    /* Knobs and pads: the square inside its padding; the 4 × 4 pads fill the pads block. */
    --band-middle-width: calc(var(--golden-side) - 2 * var(--golden-pad));
    /* Eight knobs in 439px are 54px each: the longer names and codes ("Retrig rate", "StyMuteA")
       end in an ellipsis instead of running into their neighbours. */
    --knob-gap: var(--space-4);
    --knob-text-max: 100%;
    --knob-text-overflow: hidden;
    --pad-width: calc((var(--band-middle-width) - 3 * var(--pad-gap)) / 4);
    --pad-height: calc(
      (var(--golden-pads-height) - 2 * var(--golden-pad) - var(--group-header-height) - var(--band-body-gap) -
          3 * var(--pad-gap)) / 4
    );
    /* Keys: 56 tall, the black keys 56 / φ. */
    --keys-height: var(--golden-keys-height);
    --keys-black-height: var(--golden-keys-black);
  }

  /* Every block: its rectangle, padded inside so its edges stay on the cuts. */
  .block,
  .bar,
  .display,
  .keys {
    position: absolute;
    box-sizing: border-box;
  }
  .block {
    padding: var(--golden-pad);
    min-width: 0;
  }

  .bar {
    top: var(--golden-bar-top);
    left: var(--golden-left);
    width: var(--golden-width);
    height: var(--golden-bar-height);
  }

  /* The display row: five blocks side by side, the beat bar under all of them. */
  .display {
    top: var(--golden-frame-top);
    left: var(--golden-left);
    width: var(--golden-width);
    height: var(--golden-display-height);
  }
  .display .block {
    top: 0;
    height: var(--golden-display-height);
  }
  .chord {
    left: 0;
    width: var(--golden-square);
  }
  .hero {
    margin-top: var(--golden-chord-gap);
  }
  .song {
    left: var(--golden-square);
    width: var(--golden-square);
    /* The section's top on the chord's: below the style line and its gap. */
    padding-top: calc(var(--golden-pad) + var(--tab-block) + var(--golden-chord-gap));
  }
  .transport {
    left: calc(2 * var(--golden-square));
    width: var(--golden-narrow);
  }
  .ots {
    left: calc(2 * var(--golden-square) + var(--golden-narrow));
    width: var(--golden-narrow);
  }
  .parts {
    left: calc(2 * var(--golden-square) + 2 * var(--golden-narrow));
    width: var(--golden-square);
  }
  .beat {
    position: absolute;
    top: var(--golden-beat-top);
    right: var(--golden-pad);
    left: var(--golden-pad);
  }

  /* The band: faders on the left; knobs over pads in the square. */
  .faders,
  .knobs,
  .pads {
    top: calc(var(--golden-frame-top) + var(--golden-display-height));
  }
  .faders {
    left: var(--golden-left);
    display: flex;
    flex-direction: column;
    width: var(--golden-faders-width);
    height: var(--golden-band-height);
  }
  .status {
    display: flex;
    margin-top: auto;
  }
  .knobs,
  .pads {
    left: calc(var(--golden-left) + var(--golden-faders-width));
    width: var(--golden-side);
  }
  .knobs {
    height: var(--golden-knobs-height);
  }
  .pads {
    top: calc(var(--golden-frame-top) + var(--golden-display-height) + var(--golden-knobs-height));
    height: var(--golden-pads-height);
  }

  .keys {
    top: var(--golden-keys-top);
    left: var(--golden-left);
    width: var(--golden-width);
    height: var(--golden-keys-height);
  }
</style>
