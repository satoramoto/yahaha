<!--
  StageGolden: the Stage laid out as a Golden tree (a proposal; Stage renders it with
  `layout="golden"`, Storybook only for now). The same regions and data as Stage, placed by the
  Golden primitives (Golden/), so every size comes from a cut, never from a px. The method is
  recursive (docs/factory/golden.md): the page lays out groups, each group is a new frame that
  lays out its items, and a control is a frame of its own again. Numbers at 1440 × 900:
  - Page: the whole screen is the frame, a phi box (1398 × 864) between fib-21 side margins. Its
    minor part off the top is the top half (330), the rest the bottom half (534). Each half takes a
    phi⁴ step off its outer edge: the app bar (48) off the top half, the keys (78) off the bottom.
  - Hero (1398 × 282), two tiers: its major part off the top is the reading tier (174), in thirds:
    the style line over the chord, the section over what comes next, the tempo over the beat bar.
    The rest is the controls tier (108): its major part off the left is the transport, a row of
    seven controls; the rest One Touch, its words and 1–4 in a row. No parts here (Option C: each
    part's sound is on its own fader strip).
  - Band (1398 × 456): its major part off the left is the faders (864), a header band over nine
    strips, each a FaderCell (sound, track, value, name, lamp); the rest (534) is cut minor off the
    top into knobs (a header band over eight KnobCells) over pads (a header band over a 4 × 4 grid).
  Each group sits in a `group` wrapper inset fib-13 from its block's cuts; inside a group the cuts
  sit edge to edge. The status line sits at the faders header's right end.
  Each leaf is a size container: the components' size tokens are set from its content box (cq
  units). It changes no component's default: it uses their additive props (SectionRow `cells`,
  OneTouchPicker `cells`, NowPlaying `show`, AppBar `end`, FaderCell `sound` and `lamp`). With
  `overlay`, the whole tree is drawn and checked by a GoldenOverlay.
-->
<script lang="ts">
  import type { ComponentProps } from 'svelte'
  import AppBar from '../AppBar/AppBar.svelte'
  import BarBeat from '../BarBeat/BarBeat.svelte'
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
  import KnobCell from '../Golden/KnobCell.svelte'
  import GroupHeader from '../GroupHeader/GroupHeader.svelte'
  import HueLegend from '../HueLegend/HueLegend.svelte'
  import Keys from '../Keys/Keys.svelte'
  import LampButton from '../LampButton/LampButton.svelte'
  import NowPlaying from '../NowPlaying/NowPlaying.svelte'
  import OneTouchPicker from '../OneTouchPicker/OneTouchPicker.svelte'
  import Pad from '../Pad/Pad.svelte'
  import SectionRow from '../SectionRow/SectionRow.svelte'
  import Separator from '../Separator/Separator.svelte'
  import type Stage from '../Stage/Stage.svelte'
  import StatusLine from '../StatusLine/StatusLine.svelte'
  import StyleLine from '../StyleLine/StyleLine.svelte'

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

  /** Each part, by the strip's id (right1 … left): Option C puts its sound on top of the part's strip. */
  const parts = $derived(new Map(display.soundRow.parts.map((part) => [part.id as string, part])))

  const faders = $derived(p.faders)
  const layered = $derived(faders.layerTabs.length > 0 && faders.layer !== faders.layerTabs[0].id)
  const layerWord = $derived(layered ? faders.layerTabs.find((tab) => tab.id === faders.layer)?.label : undefined)
  const pageLabel = $derived(faders.pageTabs.find((tab) => tab.id === faders.page)?.label ?? '')
  const otherLabel = $derived(faders.pageTabs.find((tab) => tab.id !== faders.page)?.label ?? '')
  /** The lamp under each strip: the part lamps under 1–4, the function lamps under 5–8; the last strip has the page button. */
  const lamps = $derived([...faders.partLamps, ...faders.functionLamps])
  const isPart = (strip: FaderStrip) => strip.kind === 'part' || strip.kind === 'off'

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

{#snippet pageButton()}
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
{/snippet}

<div class="screen">
  <GoldenBox shape="phi" inset="fib-13" name="page" overlay={p.overlay ?? false}>
    <GoldenSplit take="minor" from="top" name="halves">
      <GoldenSplit take="phi4" of="length" from="top" name="top half">
        <div class="leaf bar">
          <!-- The bar fills its cut: the grid Stage's fixed px width is dropped. -->
          <AppBar {...p.appBar} width={undefined} tipAction={p.tipAction} onchoose={p.onchoose} onhealth={p.onhealth}>
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
        <GoldenSplit take="major" from="top" name="hero">
          <GoldenGrid columns={3} name="reading">
            <div class="group">
              <GoldenBand size="tab-block" from="top" name="chord">
                <div class="leaf third">
                  <StyleLine {...style} tipAction={p.tipAction} onprev={p.onprev} onnext={p.onnext} onbrowse={p.onbrowse} />
                </div>
                <div class="leaf third foot chord"><ChordReadout {...display.nowPlaying.chord} /></div>
              </GoldenBand>
            </div>
            <div class="group">
              <GoldenBand size="tab-block" from="bottom" name="section">
                <div class="leaf foot"><NowPlaying {...song} show="next" /></div>
                <div class="leaf foot"><NowPlaying {...song} show="section" /></div>
              </GoldenBand>
            </div>
            <div class="group">
              <GoldenBand size="tab-block" from="bottom" name="tempo">
                <div class="leaf beat">
                  <BarBeat
                    beat={display.nowPlaying.running ? (display.nowPlaying.beat ?? 0) : 0}
                    beats={display.nowPlaying.beats ?? 4}
                    hue={display.nowPlaying.hue}
                  />
                </div>
                <div class="leaf middle">
                  <NowPlaying
                    {...song}
                    show="tempo"
                    tipAction={p.tipAction}
                    ontempoup={p.ontempoup}
                    ontempodown={p.ontempodown}
                    onstyletempo={p.onstyletempo}
                    ontempo={p.ontempo}
                  />
                </div>
              </GoldenBand>
            </div>
          </GoldenGrid>
          <GoldenSplit take="major" from="left" name="controls">
            <div class="group" role="toolbar" aria-label="Transport">
              <GoldenGrid columns={7} name="transport">
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
              <GoldenGrid columns={9} cell="fader" name="strips">
                {#each faders.strips as strip, i (strip.id)}
                  {@const part = parts.get(strip.id)}
                  {#snippet stripLamp()}
                    {#if i < lamps.length}{@render lamp(lamps[i])}{:else}{@render pageButton()}{/if}
                  {/snippet}
                  <FaderCell
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
                    lamp={i < lamps.length || i === faders.strips.length - 1 ? stripLamp : undefined}
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
                <GoldenGrid columns={8} cell="knob" name="knob row">
                  {#each p.knobs.knobs as knob, i (i)}
                    <KnobCell
                      label={knob.label}
                      code={knob.code}
                      value={knob.value}
                      unit={knob.unit}
                      fraction={knob.fraction}
                      unused={knob.unused}
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
  /* The keys fill theirs; the black keys are the keys' height over phi. */
  .screen .keys {
    padding: 0;
    --keys-height: 100cqh;
    --keys-black-height: calc(100cqh / var(--interval-phi));
  }

  /* The reading tier's blocks measure a third of --stage-row-width less the display's padding,
     border and gaps (Display's own tokens); with those at zero, a third is the leaf's width. */
  .third,
  .beat {
    --stage-row-width: calc(3 * 100cqw);
    --display-pad-left: 0px;
    --display-border-width: 0px;
    --display-thirds-gap: 0px;
  }
  .beat {
    display: flex;
    align-items: center;
    --stage-row-width: 100cqw;
  }
  /* The chord fills what the style line's band leaves: its hero row is the leaf less the notes
     line and its gap, the hero type scaled to that row (--type-hero's own 128 / 104). */
  .chord {
    --hero-height: calc(100cqh - var(--space-8) - var(--label-height));
    --type-hero: var(--weight-light) calc(var(--hero-height) * 128 / 104) / var(--hero-height) var(--font-sans);
  }
  /* The chord, the section and the tempo stand on their block's cut. */
  .foot {
    display: flex;
    align-items: flex-end;
  }
  /* The tempo, centred in its block: standing on the cut, its light digits' overhang would spill
     past it. */
  .middle {
    display: flex;
    align-items: center;
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

  /* A pad fills its cell, less the pads' gap. */
  .screen .pad {
    padding: calc(var(--pad-gap) / 2);
    --pad-width: 100cqw;
    --pad-height: 100cqh;
  }
</style>
