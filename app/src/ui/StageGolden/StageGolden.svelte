<!--
  StageGolden: the Stage laid out as a Golden tree (a proposal; Stage renders it with
  `layout="golden"`, Storybook only for now). The same regions and data as Stage, placed by the
  Golden primitives (Golden/), so every size comes from a cut, never from a px. The method is
  recursive (docs/factory/golden.md): the page lays out groups, each group is a new frame that
  lays out its items, and a control is a frame of its own again. Every cell has a job, its size
  follows its use, and the control fills its cell. Numbers at 1440 × 900:
  - Page: the whole screen is the frame, a phi box (1398 × 864) between fib-21 side margins. Its
    minor part off the top is the top half (330), the rest the bottom half (534). Each half takes a
    phi⁴ step off its outer edge: the app bar (48) off the top half, the keys (78) off the bottom.
    The page's spiral is turned cw from the right, so its pole (388, 238) lands on the section
    block: on what comes next.
  - Hero (1398 × 282), two tiers: a phi³ step off its bottom is the controls tier (67): its major
    part off the left the transport (six outlined cells sized by consequence: Start / Stop 2
    units; Accomp, Sync Start, the Fill ▲ ▼ pair (one unit, split in half) and Fade 1; Reset 1 at
    the far end behind a sub-cut), the rest One Touch (its caption, then 1–4). The reading tier
    (215) above it, one group, reads style → chord → section → next: a control-height band off its
    top is the style line (the category and metre at its right end); under it, a phi³ step off
    the left is the chord (324), the rest halved into the section and the tempo (524 each). Each
    reading cell is a hero row over one small line: the chord, Main B and the tempo are one size,
    their capitals filling the row (99 at 1440), on one shared line, flush left. A fib-8 under it:
    the chord's notes, the beat bar (bars the row over phi⁵ deep, faded, the current beat solid);
    a fib-34 under it, its own line: what comes next (a solid swatch and Main C in its hue, then
    "fill after bar 4"; a display, not a control). + and − are one square beside the tempo, its
    side the cap height, cut in half across (99 × 50 each at 1440).
  - Band (1398 × 456): its major part off the left is the faders (864): a header band over nine
    strips, each with its own foot (the part lamps under the part strips, then a sub-cut and the
    functions and the page button), so every lamp sits on its fader's column. The rest (534) is
    cut minor off the top into knobs (a header band over eight knob cells, an unused knob half as
    wide, each name in a two-line band and the value inside the ring, so the dial takes the
    value's band) over pads (a header band over a 4 × 4 grid). Each part's sound sits on its strip
    in the part's hue, cut short at the strip.
  Each group sits in a `group` wrapper inset fib-13 from its block's cuts; inside a group the cuts
  sit edge to edge. The status line sits at the faders header's right end.
  Each leaf is a size container: the components' size tokens are set from its content box (cq
  units). It changes no component's default: it uses their additive props (SectionRow,
  OneTouchPicker, StyleLine and TempoReadout `cells`, AppBar `end`, FaderCell `sound` and `lamp`). With
  `overlay`, the whole tree is drawn and checked by a GoldenOverlay.
-->
<script lang="ts">
  import type { ComponentProps } from 'svelte'
  import AppBar from '../AppBar/AppBar.svelte'
  import Button from '../Button/Button.svelte'
  import ChordReadout from '../ChordReadout/ChordReadout.svelte'
  import ChosenTabs from '../ChosenTabs/ChosenTabs.svelte'
  import type { TabItem } from '../ChosenTabs/types'
  import type { BankLamp, FaderStrip } from '../FaderBank/types'
  import FaderCell from '../Golden/FaderCell.svelte'
  import GoldenBand from '../Golden/GoldenBand.svelte'
  import GoldenBox from '../Golden/GoldenBox.svelte'
  import GoldenGrid from '../Golden/GoldenGrid.svelte'
  import GoldenSplit from '../Golden/GoldenSplit.svelte'
  import type { Interval } from '../Golden/golden'
  import KnobCell from '../Golden/KnobCell.svelte'
  import GroupHeader from '../GroupHeader/GroupHeader.svelte'
  import HueLegend from '../HueLegend/HueLegend.svelte'
  import Keys from '../Keys/Keys.svelte'
  import LampButton from '../LampButton/LampButton.svelte'
  import OneTouchPicker from '../OneTouchPicker/OneTouchPicker.svelte'
  import Pad from '../Pad/Pad.svelte'
  import SectionName from '../SectionName/SectionName.svelte'
  import SectionRow from '../SectionRow/SectionRow.svelte'
  import Separator from '../Separator/Separator.svelte'
  import type Stage from '../Stage/Stage.svelte'
  import StatusLine from '../StatusLine/StatusLine.svelte'
  import StyleLine from '../StyleLine/StyleLine.svelte'
  import TempoReadout from '../TempoReadout/TempoReadout.svelte'

  /** The Stage's props (the same regions and callbacks), with the running and fading Stage resolved. */
  type Props = ComponentProps<typeof Stage> & {
    /** The style is running (Stage resolves it from the section row or the old transport). */
    running?: boolean
    /** A fade is under way (as `running`). */
    fading?: boolean
    /** Draw the Golden tree's cuts, insets and spirals over the screen, and check them (GoldenOverlay). A design aid. */
    overlay?: boolean
  }

  let p: Props = $props()

  /** The keys' width in px until the keys' slot is measured (and where nothing is laid out). */
  const KEYS_FALLBACK = 1398
  /** The keys' slot's width, measured as it resizes (0 where nothing is laid out: jsdom). */
  let keysSlot = $state(0)
  let keysWidth = $derived(keysSlot > 0 ? keysSlot : KEYS_FALLBACK)

  /** Measures the keys' slot as it resizes; nothing where ResizeObserver is missing (jsdom). */
  function measureKeys(el: HTMLElement) {
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) keysSlot = Math.floor(entry.contentRect.width)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }

  const display = $derived(p.display)
  const now = $derived(display.nowPlaying)
  const style = $derived({
    styleName: display.styleLine.styleName,
    category: display.styleLine.category,
    timeSignature: display.styleLine.timeSignature,
    queued: display.styleLine.queued,
  })

  type SectionHue = 'intro' | 'main' | 'ending' | 'brk' | 'fill'
  /** A section's hue from its shown name ("Main C" → main), as the pads colour it. */
  function hueOf(name: string): SectionHue | undefined {
    const word = name.trim().split(/\s+/)[0]?.toLowerCase()
    return word === 'intro'
      ? 'intro'
      : word === 'main'
        ? 'main'
        : word === 'ending'
          ? 'ending'
          : word === 'break'
            ? 'brk'
            : word === 'fill'
              ? 'fill'
              : undefined
  }
  const next = $derived((now.next ?? '').trim())
  const nextHue = $derived(hueOf(next) ?? now.hue ?? 'main')
  /** The words after the chip: when the change lands, or the bar, or the stopped state. */
  const when = $derived.by(() => {
    if (!now.running) return now.syncStart ? 'Sync Start armed' : 'Stopped'
    if (next) return now.fill ?? ''
    return (now.bar ?? 0) > 0 && (now.bars ?? 0) > 0 ? `bar ${now.bar} of ${now.bars}` : ''
  })
  /** The playing section's characters: a long name ("Ending III") steps its size down to fit its cell. */
  const sectionChars = $derived(Math.max(1, (now.playing ?? '').trim().length))
  const beats = $derived(Math.max(1, now.beats ?? 4))
  const beat = $derived(now.running ? (now.beat ?? 0) : 0)

  /** Each part, by the strip's id (right1 … left): Option C puts its sound on top of the part's strip. */
  const parts = $derived(new Map(display.soundRow.parts.map((part) => [part.id as string, part])))

  const faders = $derived(p.faders)
  const layered = $derived(faders.layerTabs.length > 0 && faders.layer !== faders.layerTabs[0].id)
  const layerWord = $derived(layered ? faders.layerTabs.find((tab) => tab.id === faders.layer)?.label : undefined)
  const pageLabel = $derived(faders.pageTabs.find((tab) => tab.id === faders.page)?.label ?? '')
  const otherLabel = $derived(faders.pageTabs.find((tab) => tab.id !== faders.page)?.label ?? '')
  const isPart = (strip: FaderStrip) => strip.kind === 'part' || strip.kind === 'off'
  /**
   * The strips' foot, one module a strip on the strip's own column: the part lamps under the part
   * strips, then the function lamps and the page button under the rest (a sub-cut before the first
   * function, so a function never reads as a strip's state). Every strip is full width, a parked
   * one too (faded): half a strip can't hold a function's word.
   */
  type Foot = BankLamp | 'page'
  const foot: Foot[] = $derived([...faders.partLamps, ...faders.functionLamps, 'page'])
  const footCut = $derived(faders.partLamps.length)
  /** Size follows use: an unused knob is half a live one. */
  const knobWeights: Interval[] = $derived(p.knobs.knobs.map((k) => (k.unused ? 'unison' : 'octave')))
  /**
   * The transport graded by consequence: Start / Stop (a slip starts or stops the band) is the
   * widest, 2 units (the octave); Accomp, Sync Start, the Fill ▲ ▼ pair (one unit, split in half)
   * and Fade 1 each; Reset 1 at the far end, set apart from Fade by a sub-cut (a slip onto it is
   * heard).
   */
  const TRANSPORT: Interval[] = ['octave', 'unison', 'unison', 'unison', 'unison', 'unison']

  const knobTabs: TabItem[] = $derived(
    (p.knobs.pages?.length ? p.knobs.pages : [p.knobs.pageLabel ?? '']).map((label, i) => ({
      id: String(i),
      label,
      tip: 'knobs.page',
    })),
  )
  const BANK_TIPS = ['padpage.sections', 'padpage.racks', 'padpage.chord', 'padpage.multi_pads', 'padpage.setup']
  const bankTabs: TabItem[] = $derived(
    (p.pads.banks?.length ? p.pads.banks : [p.pads.bankName ?? '']).map((label, i) => ({
      id: String(i),
      label,
      tip: p.pads.bankTips?.[i] ?? BANK_TIPS[i],
    })),
  )
</script>

{#snippet lamp(item: BankLamp)}
  <LampButton
    label={item.label}
    on={item.on}
    hue={item.hue}
    rec={item.rec}
    waiting={item.waiting}
    size="cell"
    name={item.name}
    tip={item.tip}
    tipAction={p.tipAction}
    ontoggle={(on) => p.onlamp?.(item.id, on)}
    onlongpress={item.long ? () => p.onlamplong?.(item.id) : undefined}
    onlongrelease={item.long ? () => p.onlamprelease?.(item.id) : undefined}
  />
{/snippet}

<div class="screen">
  <GoldenBox shape="phi" inset="fib-13" name="page" spiralFrom="right" spiralTurn="cw" overlay={p.overlay ?? false}>
    <GoldenSplit take="minor" from="top" name="halves" spiralFrom="right" spiralTurn="cw">
      <GoldenSplit take="phi4" of="length" from="top" name="top half">
        <div class="leaf bar">
          <!-- The bar fills its cut: the grid Stage's fixed px width is dropped. -->
          <AppBar {...p.appBar} width={undefined} tipAction={p.tipAction} onchoose={p.onchoose} onhealth={p.onhealth}>
            {#snippet end()}
              <span class="helpers" role="toolbar" aria-label="Helpers">
                <SectionRow
                  {...p.sectionRow}
                  groups="helpers"
                  cells
                  running={p.running}
                  fading={p.fading}
                  tipAction={p.tipAction}
                  onmetronome={p.onmetronome}
                  onmetronomesettings={p.onmetronomesettings}
                  onunison={p.onunison}
                  onpanic={p.onpanic}
                  onhelp={p.onhelp}
                />
              </span>
            {/snippet}
          </AppBar>
        </div>
        <GoldenSplit take="phi3" of="length" from="bottom" name="hero">
          <GoldenSplit take="major" from="left" name="controls">
            <div class="group" role="toolbar" aria-label="Transport">
              <GoldenGrid weights={TRANSPORT} name="transport">
                <SectionRow
                  {...p.sectionRow}
                  groups="transport"
                  cells
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
              </GoldenGrid>
            </div>
            <div
              class="group"
              role="group"
              aria-label="One Touch Setting (OTS). Click to apply; on the Launchkey, Shift + pads 9 to 12"
            >
              <GoldenGrid columns={5} name="one touch">
                <OneTouchPicker
                  cells
                  applied={display.styleLine.oneTouch ?? 0}
                  count={display.styleLine.oneTouchCount ?? 4}
                  tipAction={p.tipAction}
                  onapply={p.ononetouch}
                />
              </GoldenGrid>
            </div>
          </GoldenSplit>
          <div class="group">
            <GoldenBand size="control-height" from="top" gap="fib-8" name="reading">
              <div class="leaf style">
                <StyleLine {...style} cells tipAction={p.tipAction} onprev={p.onprev} onnext={p.onnext} onbrowse={p.onbrowse} />
              </div>
              <GoldenSplit take="phi3" of="length" from="left" name="now">
                <div class="leaf reading chord"><ChordReadout {...now.chord} /></div>
                <GoldenGrid columns={2} name="section and tempo">
                  <div class="leaf reading section">
                    <div class="stand" style:--chars={sectionChars}>
                      <SectionName label={now.playing} hue={now.hue} idle={!now.running} />
                    </div>
                    <div class="next" role="group" aria-label="Next section">
                      {#if next}
                        <span class="swatch" style:--hue="var(--{nextHue})" aria-hidden="true"></span>
                        <span class="next-name" style:--hue="var(--{nextHue})" data-hue={nextHue}>{next}</span>
                      {/if}
                      {#if next && when}<span class="dot" aria-hidden="true">·</span>{/if}
                      {#if when}<span class="when" class:sync={!now.running && now.syncStart}>{when}</span>{/if}
                    </div>
                  </div>
                  <div class="leaf reading tempo">
                    <div class="stand">
                      <TempoReadout
                        cells
                        bpm={now.bpm}
                        tipAction={p.tipAction}
                        ontempo={p.ontempo}
                        onplus={p.ontempoup}
                        onminus={p.ontempodown}
                        onreset={p.onstyletempo}
                      />
                    </div>
                    <div class="beats" role="img" aria-label={beat > 0 ? `Beat ${beat} of ${beats}` : `${beats} beats, stopped`}>
                      {#each { length: beats } as _, i (i)}
                        <span
                          class="beat"
                          class:now={i + 1 === beat}
                          style:--hue="var(--{now.hue ?? 'main'})"
                          style:--faded="var(--absent-{now.hue ?? 'main'})"
                        ></span>
                      {/each}
                    </div>
                  </div>
                </GoldenGrid>
              </GoldenSplit>
            </GoldenBand>
          </div>
        </GoldenSplit>
      </GoldenSplit>
      <GoldenSplit take="phi4" of="length" from="bottom" name="bottom half">
        <div class="leaf keys" {@attach measureKeys}>
          <Keys {...p.keys} width={keysWidth} />
        </div>
        <GoldenSplit take="major" from="left" name="band">
          <section class="group" aria-label="Faders">
            <GoldenBand size="group-header-height" from="top" name="faders">
              <div class="leaf header">
                <GroupHeader title="Faders" detail={layerWord}>
                  <ChosenTabs
                    size="header"
                    label="Fader page (master button)"
                    tabs={faders.pageTabs}
                    chosen={faders.page}
                    tipAction={p.tipAction}
                    onchoose={p.onchoosePage}
                  />
                  <Separator />
                  <span class="layer">
                    <span class="layer-word">Layer</span>
                    <ChosenTabs
                      size="header"
                      label="Fader layer"
                      tabs={faders.layerTabs}
                      chosen={faders.layer}
                      tipAction={p.tipAction}
                      onchoose={p.onchooseLayer}
                    />
                  </span>
                  {#snippet end()}
                    <span class="status"><StatusLine {...p.status} tipAction={p.tipAction} onclear={p.onclear} /></span>
                  {/snippet}
                </GroupHeader>
              </div>
              <GoldenGrid columns={faders.strips.length} name="strips">
                  {#each faders.strips as strip, i (strip.id)}
                    {@const part = parts.get(strip.id)}
                    {@const item = foot[i]}
                    {#snippet footOf()}
                      <span class="foot" class:cut={i === footCut}>
                        {#if item === 'page'}
                          <Button
                            label={pageLabel}
                            size="cell"
                            name={`Fader page is ${pageLabel}: click for ${otherLabel}`}
                            tip="mixer.page"
                            tipAction={p.tipAction}
                            onpress={p.onpagebutton}
                            onlongpress={p.onpagelong}
                            onlongrelease={p.onpagerelease}
                          />
                        {:else if item}
                          {@render lamp(item)}
                        {/if}
                      </span>
                    {/snippet}
                    <FaderCell
                      lamp={item ? footOf : undefined}
                      name={strip.faderName}
                      label={strip.tag}
                      value={strip.value}
                      level={strip.level}
                      meter={strip.meter}
                      meter2={strip.meter2}
                      peak={strip.peak}
                      away={strip.away}
                      kind={strip.kind}
                      hue={strip.hue}
                      layered={layered && isPart(strip)}
                      tip={strip.tip}
                      sound={part?.sound ?? ''}
                      soundName={part ? `${part.partName} sound: ${part.sound}. Opens the quick sound list` : undefined}
                      soundTip={part ? 'launchkey.fader_sound' : undefined}
                      onsound={part ? () => p.onsound?.(part.id) : undefined}
                      onopen={() => p.onopen?.(strip.id)}
                      openName={strip.openName}
                      openTip={strip.openTip}
                      edited={strip.edited}
                      missing={strip.missing}
                      failed={strip.failed}
                      tipAction={p.tipAction}
                      onlevel={(level) => p.onlevel?.(strip.id, level)}
                    />
                  {/each}
              </GoldenGrid>
            </GoldenBand>
          </section>
          <GoldenSplit take="minor" from="top" name="knobs and pads">
            <section class="group" aria-label="Knobs">
              <GoldenBand size="group-header-height" from="top" name="knobs">
                <div class="leaf header">
                  <GroupHeader title="Knobs">
                    <ChosenTabs
                      size="header"
                      label="Knob page"
                      tabs={knobTabs}
                      chosen={String(p.knobs.pages?.length ? (p.knobs.page ?? 0) : 0)}
                      tipAction={p.tipAction}
                      onchoose={(id) => p.onknobpage?.(Number(id))}
                    />
                  </GroupHeader>
                </div>
                <GoldenGrid weights={knobWeights} name="knob row">
                  {#each p.knobs.knobs as knob, i (i)}
                    <KnobCell
                      label={knob.label}
                      code={knob.code}
                      value={knob.value}
                      unit={knob.unit}
                      fraction={knob.fraction}
                      unused={knob.unused}
                      lines={2}
                      valueInside
                      tip="knobs.knob"
                      tipAction={p.tipAction}
                      onpress={() => p.onknobpress?.(i)}
                      onstep={(delta) => p.onstep?.(i, delta)}
                    />
                  {/each}
                </GoldenGrid>
              </GoldenBand>
            </section>
            <section class="group" aria-label="Pads">
              <GoldenBand size="group-header-height" from="top" name="pads">
                <div class="leaf header">
                  <GroupHeader title="Pads">
                    <ChosenTabs
                      size="header"
                      label="Pad bank"
                      tabs={bankTabs}
                      chosen={String(p.pads.banks?.length ? (p.pads.bank ?? 0) : 0)}
                      tipAction={p.tipAction}
                      onchoose={(id) => p.onpadbank?.(Number(id))}
                    />
                    {#snippet end()}
                      {#if p.pads.legend?.length}<HueLegend items={p.pads.legend} />{/if}
                    {/snippet}
                  </GroupHeader>
                </div>
                <GoldenGrid columns={4} rows={4} name="pad grid">
                  {#each p.pads.pads as pad, i (i)}
                    <div class="leaf pad">
                      <Pad
                        label={pad.label}
                        index={String(i + 1)}
                        family={pad.family}
                        state={pad.state}
                        lit={p.pads.lit ?? true}
                        name={pad.name}
                        tip={pad.tip}
                        tipAction={p.tipAction}
                        onpress={() => p.onpadpress?.(i)}
                      />
                    </div>
                  {/each}
                </GoldenGrid>
              </GoldenBand>
            </section>
          </GoldenSplit>
        </GoldenSplit>
      </GoldenSplit>
    </GoldenSplit>
  </GoldenBox>
</div>

<style>
  .screen {
    box-sizing: border-box;
    width: var(--screen-width);
    height: var(--screen-height);
    padding: 0 var(--fib-21);
    overflow: hidden;
    container-type: size;
    background: var(--g);
    color: var(--t);
    font-family: var(--font-sans);
  }

  /* Every leaf is a size container: the tokens below measure its content box (100cqw × 100cqh). */
  .leaf {
    container-type: size;
  }

  /* A group: a new frame inside its block, inset fib-13 from the block's cuts; its own cuts sit
     edge to edge (no inset inside it). */
  .screen .group {
    box-sizing: border-box;
    padding: var(--fib-13);
    container-type: size;
    --golden-inset: 0px;
  }

  /* The app bar fills its phi⁴ step, edge to edge across the frame. */
  .screen .bar {
    padding: 0;
    --bar-height: 100cqh;
  }
  /* The helpers: outlined cells, each as wide as its words, a control-height tall. */
  .helpers {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: max-content;
    column-gap: var(--fib-5);
    height: var(--control-height);
  }
  /* The keys fill theirs; the black keys are the keys' height over phi. */
  .screen .keys {
    padding: 0;
    --keys-height: 100cqh;
    --keys-black-height: calc(100cqh / var(--interval-phi));
  }

  /* The style line: the reading tier's header, a control-height band (‹ › 32px squares). */
  .style {
    display: flex;
  }

  /* The reading cells (chord, section, tempo), one leaf each, so descenders stay inside: a hero
     row (--row: all the cell but a label-height line and the --next-gap over it) whose foot is
     the shared line every hero value stands on, flush left; then one small line (the chord's
     notes and the beat bar a fib-8 under the line; what comes next a fib-34 under it, its own
     line). The three heroes are one size, the size whose capitals fill the row (--cap-font: the
     face's capitals are 0.70 of its size, measured), so the row holds no empty band over them and
     the tempo's + − square (its side the cap height) is big enough to hit. A fib-13 gutter before
     the next cut. */
  .reading {
    --next-gap: var(--fib-34);
    --row: calc(100cqh - var(--label-height) - var(--next-gap));
    --cap-font: calc(var(--row) / 0.7);
    --type-poster: var(--weight-light) var(--cap-font) / var(--cap-font) var(--font-sans);
    --tracking-poster: var(--tracking-hero);
    display: flex;
    flex-direction: column;
    row-gap: var(--fib-8);
    box-sizing: border-box;
    height: 100%;
    min-width: 0;
  }
  .chord,
  .section {
    padding-right: var(--fib-13);
  }
  .chord {
    display: block;
    --stage-row-width: calc(3 * 100cqw);
    --display-pad-left: 0px;
    --display-border-width: 0px;
    --display-thirds-gap: 0px;
    --hero-height: calc(var(--cap-font) * 104 / 128);
    --type-hero: var(--weight-light) var(--cap-font) / var(--hero-height) var(--font-sans);
  }
  /* The chord at the heroes' one size (its own 128 / 104 line), set down so its baseline lands on
     the row's foot. The hero face's baseline sits 0.0815 of its 128 / 104 line above the line's
     foot (its descent less the half-leading, measured), so the readout's top is the row less the
     line plus that much: the chord's baseline lands on the shared line exactly, as Main B's and
     the tempo's do (their boxes are trimmed to the baseline with text-box, which the chord's
     fitted row can't take). Its notes come back up by as much, so they sit a fib-8 under the
     line. */
  .chord > :global(*) {
    margin-top: calc(var(--row) - var(--hero-height) * (1 - 0.0815));
  }
  .chord :global(.line) {
    margin-top: calc(var(--fib-8) - var(--hero-height) * 0.0815);
  }
  .stand {
    display: flex;
    flex: none;
    align-items: flex-end;
    height: var(--row);
  }
  /* Main B's box ends on its baseline; its descent (a g in "Ending") may still draw down to the
     cell's foot, over the gap and the small line's height (the line is short and flush left, the
     descender far to its right), and no further, so the cell holds it. */
  .section .stand > :global(*) {
    text-box: trim-end cap alphabetic;
    overflow: clip;
    overflow-clip-margin: calc(var(--label-height) + var(--next-gap));
  }
  /* A long section name ("Ending III") steps down to fit its cell: at most the cell's width over
     its characters at 0.52 em a character (the face's widest names, measured); the baseline holds. */
  .section .stand {
    --type-poster: var(--weight-light) min(var(--cap-font), 100cqw / (var(--chars) * 0.52)) / 1 var(--font-sans);
  }
  /* What comes next, its own flush-left line a fib-34 under Main B: a short solid swatch in the
     next section's hue (a mark, like the pads legend's swatch, not a control), the next section
     in its hue at the strong weight, "·", when it lands in the plain small text. No outline, no
     fill: it is a display, not a control. */
  .next {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    height: var(--label-height);
    margin: calc(var(--next-gap) - var(--fib-8)) 0 0;
    white-space: nowrap;
    font: var(--type-text);
    letter-spacing: var(--tracking-text);
    color: var(--t);
  }
  .swatch {
    flex: none;
    width: var(--fib-21);
    height: var(--fib-5);
    margin-right: var(--space-4);
    background: var(--hue);
  }
  .next-name {
    color: var(--hue);
    font: var(--type-strong);
    letter-spacing: var(--tracking-strong);
  }
  .when.sync {
    color: var(--ok);
  }
  /* The beat bar, a display: one bar a beat in the line a fib-8 under the tempo, each the hero
     row over phi⁵ deep (a golden fraction of the numeral: 9px at 1440); the others faded in the
     section's hue, the current one solid; no outlines. */
  .beats {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: minmax(0, 1fr);
    align-items: start;
    column-gap: var(--fib-5);
    height: var(--label-height);
  }
  .beat {
    height: calc(var(--row) / var(--interval-phi4) / var(--interval-phi));
    background: var(--faded);
  }
  .beat.now {
    background: var(--hue);
  }

  /* The headers: the group's width. */
  .header {
    display: flex;
  }
  .header > :global(*) {
    flex: 1;
    min-width: 0;
  }
  .layer {
    display: flex;
    align-items: baseline;
  }
  .layer-word {
    margin-right: var(--space-4);
    color: var(--caption-ink);
    font: var(--type-text);
    letter-spacing: var(--tracking-text);
  }
  .status {
    display: flex;
    min-width: 0;
    overflow: hidden;
  }

  /* A strip's foot: its lamp (or the page button) filling the strip's lamp band; the first
     function starts a fib-13 sub-cut in, so a function never reads as a part's state. */
  .foot {
    display: grid;
    height: 100%;
  }
  .foot > :global(*) {
    width: 100%;
    min-width: 0;
  }
  .foot.cut {
    width: calc(100% - var(--fib-13));
    margin-left: var(--fib-13);
  }

  /* A pad fills its cell, less the pads' gap. */
  .screen .pad {
    padding: calc(var(--pad-gap) / 2);
    --pad-width: 100cqw;
    --pad-height: 100cqh;
  }
</style>
