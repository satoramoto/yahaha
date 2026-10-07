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
    part off the left the transport (six outlined cells graded by phi: Start / Stop φ², Accomp,
    Sync Start and the fills φ, Fade and Reset 1), the rest One Touch (its caption, then 1–4). The
    reading tier (215) above it: a phi³ step off its left is the chord (330, the spiral's square);
    the rest is halved into the section and the tempo (534 each). Each reading cell's major part
    off the top ends on one shared line, the hero values' baseline: the chord, Main B and the
    tempo stand on it, flush left. Under it: the chord's notes; what comes next (a waiting chip in
    its hue, then when); the beat bar (one segment a beat) over the style line (‹ › as cells).
  - Band (1398 × 456): its major part off the left is the faders (864): a header band, then the
    lamp row (a control-height band off the bottom: the part lamps under their strips, a sub-cut,
    then the functions), then nine strips weighted by use (a live strip an octave of a parked
    one). The rest (534) is cut minor off the top into knobs (a header band over eight knob
    cells, an unused knob half as wide) over pads (a header band over a 4 × 4 grid).
  Each group sits in a `group` wrapper inset fib-13 from its block's cuts; inside a group the cuts
  sit edge to edge. The status line sits at the faders header's right end.
  Each leaf is a size container: the components' size tokens are set from its content box (cq
  units). It changes no component's default: it uses their additive props (SectionRow,
  OneTouchPicker, StyleLine and TempoReadout `cells`, AppBar `end`, FaderCell `sound`). With
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
  /** Size follows use: a live strip is an octave of a parked one (the unused faders give their width away). */
  const stripWeights: Interval[] = $derived(faders.strips.map((s) => (s.kind === 'parked' ? 'unison' : 'octave')))
  /** The same for the knobs: an unused knob is half a live one. */
  const knobWeights: Interval[] = $derived(p.knobs.knobs.map((k) => (k.unused ? 'unison' : 'octave')))
  /** The transport graded by use, in phi steps: Start / Stop, then Accomp, Sync Start and the fills, then Fade and Reset. */
  const TRANSPORT: Interval[] = ['phi2', 'phi', 'phi', 'phi', 'unison', 'unison']

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
          <GoldenSplit take="phi3" of="length" from="left" name="reading">
            <div class="group">
              <div class="leaf chord"><ChordReadout {...now.chord} /></div>
            </div>
            <GoldenGrid columns={2} name="now and tempo">
              <div class="group">
                <div class="leaf section">
                  <div class="stand"><SectionName label={now.playing} hue={now.hue} idle={!now.running} /></div>
                  <div class="next" role="group" aria-label="Next section">
                    {#if next}
                      <span class="then">then</span>
                      <span class="chip" style:--hue="var(--{nextHue})" data-face="waiting" data-hue={nextHue}>{next}</span>
                    {/if}
                    {#if when}<span class="when" class:sync={!now.running && now.syncStart}>{when}</span>{/if}
                  </div>
                </div>
              </div>
              <div class="group">
                <GoldenSplit take="major" from="top" name="tempo">
                  <div class="leaf tempo">
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
                  <GoldenBand size="label-height" from="top" gap="fib-8" name="beat and style">
                    <div class="leaf beats" role="img" aria-label={beat > 0 ? `Beat ${beat} of ${beats}` : `${beats} beats, stopped`}>
                      {#each { length: beats } as _, i (i)}
                        <span class="beat" class:now={i + 1 === beat} style:--hue="var(--{now.hue ?? 'main'})"></span>
                      {/each}
                    </div>
                    <GoldenBand size="control-height" from="bottom">
                      <div class="leaf style">
                        <StyleLine
                          {...style}
                          cells
                          tipAction={p.tipAction}
                          onprev={p.onprev}
                          onnext={p.onnext}
                          onbrowse={p.onbrowse}
                        />
                      </div>
                      <div class="leaf"></div>
                    </GoldenBand>
                  </GoldenBand>
                </GoldenSplit>
              </div>
            </GoldenGrid>
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
              <GoldenBand size="control-height" from="bottom" gap="fib-8" name="strips and lamps">
                <GoldenGrid columns={2} name="lamps">
                  <div class="leaf lamps" role="group" aria-label="Parts on and off">
                    {#each faders.partLamps as item (item.id)}{@render lamp(item)}{/each}
                  </div>
                  <div class="leaf lamps functions" role="group" aria-label="Functions">
                    {#each faders.functionLamps as item (item.id)}{@render lamp(item)}{/each}
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
                  </div>
                </GoldenGrid>
                <GoldenGrid weights={stripWeights} name="strips">
                  {#each faders.strips as strip (strip.id)}
                    {@const part = parts.get(strip.id)}
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
                      tipAction={p.tipAction}
                      onlevel={(level) => p.onlevel?.(strip.id, level)}
                    />
                  {/each}
                </GoldenGrid>
              </GoldenBand>
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

  /* The chord: its hero row is the cell's major part, so the chord stands on the reading tier's
     shared line (the section's and the tempo's major cut); its notes sit under it. The hero type
     is scaled to the row (--type-hero's own 128 / 104); the readout is the leaf's width. */
  .chord {
    height: 100%;
    --stage-row-width: calc(3 * 100cqw);
    --display-pad-left: 0px;
    --display-border-width: 0px;
    --display-thirds-gap: 0px;
    --hero-height: calc(100cqh / var(--interval-phi));
    --type-hero: var(--weight-light) calc(var(--hero-height) * 128 / 104) / var(--hero-height) var(--font-sans);
  }
  /* The hero face's baseline sits 0.0815 of its 128 / 104 line above the line's foot (its
     descent less the half-leading, measured); the readout drops by that much, so the chord's
     baseline lands on the shared line exactly, as Main B's and the tempo's do (their boxes are
     trimmed to the baseline with text-box, which the chord's fitted row can't take). */
  .chord > :global(*) {
    margin-top: calc(var(--hero-height) * 0.0815);
  }
  /* The section cell, one leaf (like the chord's, so a name's descenders stay inside it): Main B
     stands on the shared line, the cell's major part off the top, flush left (its box trimmed to
     the baseline); what comes next fills the rest, standing on the cell's foot. */
  .section {
    display: flex;
    flex-direction: column;
    height: 100%;
  }
  .stand {
    display: flex;
    flex: none;
    align-items: flex-end;
    height: calc(100cqh / var(--interval-phi));
  }
  .stand > :global(*) {
    text-box: trim-end cap alphabetic;
  }
  /* What comes next: "then", the next section as a waiting chip in its hue (the pads' NEXT: a
     2px ring), then when it lands. One line, the small size. */
  .next {
    display: flex;
    flex: 1;
    align-items: flex-end;
    gap: var(--space-8);
    white-space: nowrap;
    font: var(--type-text);
    letter-spacing: var(--tracking-text);
    color: var(--caption-ink);
  }
  .chip {
    display: inline-flex;
    align-items: center;
    box-sizing: border-box;
    height: var(--control-height);
    padding: 0 var(--space-12);
    box-shadow: inset 0 0 0 var(--outline-width-wait) var(--hue);
    color: var(--hue);
  }
  .then,
  .when {
    line-height: var(--control-height);
  }
  .when.sync {
    color: var(--ok);
  }
  /* The beat bar: one segment a beat, a label-height tall; the current beat solid, the others
     outlined in the section's hue. */
  .beats {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: minmax(0, 1fr);
    column-gap: var(--fib-5);
  }
  .beat {
    box-shadow: inset 0 0 0 var(--outline-width) var(--hue);
  }
  .beat.now {
    background: var(--hue);
  }
  .style {
    display: flex;
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

  /* The lamp row: the part lamps under their four strips; a sub-cut (fib-13), then the functions
     and the page button, so a function never reads as a strip's state. */
  .lamps {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: minmax(0, 1fr);
  }
  .lamps.functions {
    padding-left: var(--fib-13);
  }
  .lamps > :global(*) {
    width: 100%;
    min-width: 0;
  }

  /* A pad fills its cell, less the pads' gap. */
  .screen .pad {
    padding: calc(var(--pad-gap) / 2);
    --pad-width: 100cqw;
    --pad-height: 100cqh;
  }
</style>
