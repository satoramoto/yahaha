<!--
  StageGolden: the Stage laid out as a Golden tree (a proposal; Stage renders it with
  `layout="golden"`, Storybook only for now). The same regions and data as Stage, placed by the
  Golden primitives (Golden/), so every size comes from a cut, never from a px:
  - the screen (--screen-width × --screen-height, a fib-21 margin) holds a centred stack as wide as
    the frame: the app bar on top (a bar-height band), the keys at the foot (a keys-height band),
    a fib-8 gap each, and the frame between them. At 1440 × 900 the frame is about 1214 × 750;
  - the frame is a phi box. Its minor part, off the top, is the display row: chord, song,
    transport, One Touch and parts in cells of square, square, 1:phi, 1:phi, square (= phi³), the
    beat bar over all five, ¾ of the way down. The rest is the band: a square off its right side
    cut into knobs (its minor part, on top) over pads; the faders take what is left, the status
    line at their foot;
  - every leaf in the frame keeps a fib-13 inset, so its content stays inside the cuts.
  Each leaf is a size container: the components' size tokens are set from its content box (cq
  units). It changes no component: it uses their additive props (SectionRow `groups` and
  `orientation`, OneTouchPicker `orientation`, SoundRow `showOneTouch`, PadBank `columns`, AppBar
  `end`). With `overlay`, the whole tree is drawn and checked by a GoldenOverlay.
-->
<script lang="ts">
  import type { ComponentProps } from 'svelte'
  import AppBar from '../AppBar/AppBar.svelte'
  import BarBeat from '../BarBeat/BarBeat.svelte'
  import ChordReadout from '../ChordReadout/ChordReadout.svelte'
  import FaderBank from '../FaderBank/FaderBank.svelte'
  import GoldenBand from '../Golden/GoldenBand.svelte'
  import GoldenBox from '../Golden/GoldenBox.svelte'
  import GoldenRow from '../Golden/GoldenRow.svelte'
  import GoldenSplit from '../Golden/GoldenSplit.svelte'
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
    /** Draw the Golden tree's cuts, insets and spiral over the screen, and check them (GoldenOverlay). A design aid. */
    overlay?: boolean
  }

  let p: Props = $props()

  /** The keys' width in px until the keys' slot is measured (and where nothing is laid out). */
  const KEYS_FALLBACK = 1217
  let keysSlot = $state(0)
  let keysWidth = $derived(keysSlot > 0 ? keysSlot : KEYS_FALLBACK)

  /** Measures the keys' slot (its content width) as it resizes; nothing where ResizeObserver is missing (jsdom). */
  function measureKeys(el: HTMLElement) {
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => (keysSlot = el.clientWidth))
    observer.observe(el)
    return () => observer.disconnect()
  }

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

{#snippet beatBar()}
  <div class="beat">
    <BarBeat
      beat={display.nowPlaying.running ? (display.nowPlaying.beat ?? 0) : 0}
      beats={display.nowPlaying.beats ?? 4}
      hue={display.nowPlaying.hue}
    />
  </div>
{/snippet}

<div class="screen">
  <div class="stack">
    <GoldenBand size="bar-height" from="top" gap="fib-8" name="screen" overlay={p.overlay ?? false}>
      <div class="leaf">
        <AppBar {...p.appBar} tipAction={p.tipAction} onchoose={p.onchoose} onhealth={p.onhealth}>
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
      <GoldenBand size="keys-height" from="bottom" gap="fib-8" name="keys and frame">
        <div class="leaf keys" {@attach measureKeys}>
          <Keys {...p.keys} width={keysWidth} />
        </div>
        <GoldenBox shape="phi" inset="fib-13" name="frame">
          <GoldenSplit take="minor" from="top" name="display and band">
            <GoldenRow cells={['unison', 'unison', '1:phi', '1:phi', 'unison']} shape="phi3" name="display" over={beatBar}>
              <div class="leaf third">
                <StyleLine {...style} tipAction={p.tipAction} onprev={p.onprev} onnext={p.onnext} onbrowse={p.onbrowse} />
                <div class="hero"><ChordReadout {...display.nowPlaying.chord} /></div>
              </div>
              <div class="leaf third">
                <div class="song">
                  <NowPlaying
                    {...song}
                    tipAction={p.tipAction}
                    ontempoup={p.ontempoup}
                    ontempodown={p.ontempodown}
                    onstyletempo={p.onstyletempo}
                    ontempo={p.ontempo}
                  />
                </div>
              </div>
              <div class="leaf">
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
              <div class="leaf">
                <OneTouchPicker
                  orientation="vertical"
                  applied={display.styleLine.oneTouch ?? 0}
                  count={display.styleLine.oneTouchCount ?? 4}
                  tipAction={p.tipAction}
                  onapply={p.ononetouch}
                />
              </div>
              <div class="leaf third">
                <SoundRow parts={display.soundRow.parts} showOneTouch={false} tipAction={p.tipAction} onsound={p.onsound} />
              </div>
            </GoldenRow>
            <GoldenSplit take="square" from="right" name="band">
              <GoldenSplit take="minor" from="top" name="knobs and pads">
                <div class="leaf knobs">
                  <KnobBank {...p.knobs} tipAction={p.tipAction} onpage={p.onknobpage} onpress={p.onknobpress} onstep={p.onstep} />
                </div>
                <div class="leaf pads">
                  <PadBank {...p.pads} columns={4} tipAction={p.tipAction} onbank={p.onpadbank} onpress={p.onpadpress} />
                </div>
              </GoldenSplit>
              <div class="leaf faders">
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
            </GoldenSplit>
          </GoldenSplit>
        </GoldenBox>
      </GoldenBand>
    </GoldenBand>
  </div>
</div>

<style>
  .screen {
    box-sizing: border-box;
    width: var(--screen-width);
    height: var(--screen-height);
    padding: var(--fib-21);
    overflow: hidden;
    container-type: size;
    background: var(--g);
    color: var(--t);
    font-family: var(--font-sans);
  }
  /* The stack is as wide as the frame (a phi box in the height the two bands and their gaps leave),
     so the app bar and the keys line up with it; never wider than the screen. */
  .stack {
    width: min(100%, calc((100cqh - var(--bar-height) - var(--keys-height) - 2 * var(--fib-8)) * var(--interval-phi)));
    height: 100%;
    margin-inline: auto;
  }

  /* Every leaf is a size container: the tokens below measure its content box (100cqw × 100cqh). */
  .leaf {
    container-type: size;
  }

  .keys {
    /* The black keys: the keys' height over phi. */
    --keys-black-height: calc(var(--keys-height) / var(--interval-phi));
  }

  /* The display's blocks measure a third of --stage-row-width less the display's padding, border
     and gaps (Display's own tokens); with those at zero, a third is the leaf's width. */
  .third {
    --stage-row-width: calc(3 * 100cqw);
    --display-pad-left: 0px;
    --display-border-width: 0px;
    --display-thirds-gap: 0px;
  }
  .hero {
    margin-top: var(--fib-13);
  }
  /* The song's section on the chord's line: below the style line and its gap. */
  .song {
    padding-top: calc(var(--tab-block) + var(--fib-13));
  }
  /* The beat bar, ¾ of the way down the row, across it inside the row's inset. Its container is the
     row's `over` box, inset like a leaf, so 100cqw is the row less its inset. */
  .beat {
    position: absolute;
    top: 75%;
    right: var(--golden-inset);
    left: var(--golden-inset);
    --stage-row-width: 100cqw;
    --display-pad-left: 0px;
    --display-border-width: 0px;
  }

  /* Knobs: the leaf's width. Eight knobs in a narrow square: the longer names and codes
     ("Retrig rate", "StyMuteA") end in an ellipsis instead of running into their neighbours. */
  .knobs {
    --band-middle-width: 100cqw;
    --knob-gap: var(--space-4);
    --knob-text-max: 100%;
    --knob-text-overflow: hidden;
  }
  /* Pads: the 4 × 4 grid fills the leaf under the bank's header. */
  .pads {
    --band-middle-width: 100cqw;
    --pad-width: calc((100cqw - 3 * var(--pad-gap)) / 4);
    --pad-height: calc((100cqh - var(--group-header-height) - var(--band-body-gap) - 3 * var(--pad-gap)) / 4);
  }

  /* Faders: the leaf less the status line and an inset's gap above it; the strips take every px the
     header, captions and lamps leave. */
  .faders {
    display: flex;
    flex-direction: column;
    --band-faders-width: 100cqw;
    --band-height: calc(100cqh - var(--golden-inset) - var(--space-20));
    --fader-strip-height: calc(
      var(--band-height) - var(--group-header-height) - var(--band-body-gap) - var(--band-caption-gap) -
        var(--band-caption-height) - var(--band-lamp-gap) - var(--control-height)
    );
    --fader-height: calc(var(--fader-strip-height) - var(--fader-name-height));
  }
  .status {
    display: flex;
    margin-top: auto;
  }
</style>
