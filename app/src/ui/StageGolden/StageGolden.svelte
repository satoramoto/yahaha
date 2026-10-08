<!--
  StageGolden: the Stage laid out as a Golden tree (a proposal; Stage renders it with
  `layout="golden"`, Storybook only for now). The same regions and data as Stage, placed by the
  Golden primitives (Golden/), so every size comes from a cut or a named token, never from a px.
  The geometry is the owner's wireframe (docs/factory/golden.md, "The Stage"); the components keep
  the hill-climb's learnings. Numbers at 1440 × 900 (the frame 1398 wide, fib-21 side margins and a
  fib-21 foot; the app bar on the screen's top edge):
  - App bar (36, the bar-height band), a fib-8, then the controls row: a control-height band one
    golden step deeper (32 × phi = 52), a fib-13 before the display. Its widths are phi steps of
    its height (each group's box that many heights wide, its columns weighted in the same
    intervals, each key its cell less the gaps): the transport flush left, Start / Stop phi³ (220), Sync Start
    and Accomp phi² (136), Fill Up, Fill Down and Fade phi (84), Reset's cell an octave (104) whose
    part past phi is its gutter (20), so Reset stands apart; One Touch flush right, its caption a
    phi cell and 1–4 squares, in the style's violet.
  - Display (1398 × 288): three phi boxes across the frame (`take="phi" boxes={3}`), a fib-21
    before the band. A phi³ step off its foot (68) holds the beat bar, standing under the line it
    makes (1 − 1/phi³ down, the wireframe's lower line), across the display; the rest (220) is
    three equal thirds (466), each inset a fib-21: the style line over the chord and its notes;
    the section with "then ▬ Main C · fill after bar 4" under it; the tempo, "BPM" at 32px and
    + over − beside it. The chord is half the display's height (144 at 1440); the section and the
    tempo a phi step down (89), their capitals topped on the chord's; a long name steps down
    within its third.
  - Band (1398 × 384), two equal halves (688 | 689) with a fib-21 gutter: the faders (a header
    band over nine strips, each with its own foot: part lamps, then the functions and the page
    button) and the knobs over the pads (a header band over eight knob cells; a header band over
    2 × 8 pads at 6:5, `take="minor-third" boxes={4}`).
  - The status line in a label-height band a fib-5 under the band; the keys (56, the keys-height
    band) under it, the black keys 56 / phi.
  Each leaf is a size container: the components' size tokens are set from its content box (cq
  units). It changes no component's default: it uses their additive props. With `overlay`, the
  whole tree is drawn and checked by a GoldenOverlay.
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
  /** The playing section's characters: a long name ("Ending III") steps its size down to fit its third. */
  const sectionChars = $derived(Math.max(1, (now.playing ?? '').trim().length))
  const beats = $derived(Math.max(1, now.beats ?? 4))
  const beat = $derived(now.running ? (now.beat ?? 0) : 0)

  /** Each part, by the strip's id (right1 … left): its sound sits on top of the part's strip. */
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
   * function, so a function never reads as a strip's state).
   */
  type Foot = BankLamp | 'page'
  const foot: Foot[] = $derived([...faders.partLamps, ...faders.functionLamps, 'page'])
  const footCut = $derived(faders.partLamps.length)
  /** Every knob cell one width, assigned or not. */
  const knobWeights: Interval[] = $derived(p.knobs.knobs.map(() => 'unison'))
  /**
   * The transport's cells, phi steps of the controls row's height (the wireframe's 136 · 84 · 52
   * from a 32 row, here from 52): Start / Stop phi³, Sync Start and Accomp phi², Fill Up, Fill
   * Down and Fade phi, Reset's cell an octave: Reset keeps phi and the rest of its cell is the
   * gutter that sets it apart (--reset-gap).
   */
  const TRANSPORT: Interval[] = ['phi3', 'phi2', 'phi2', 'phi', 'phi', 'phi', 'octave']
  /** One Touch: its caption a phi cell (a label, not a button), then 1–4 as squares of the row. */
  const ONE_TOUCH: Interval[] = ['phi', 'unison', 'unison', 'unison', 'unison']
  /**
   * A queued fill: what comes next lands after a fill ("fill after bar 4"), from one Main to
   * another, so Fill Up (to a later Main) or Fill Down is queued: said in its spoken name, its face
   * plain off (SectionRow `plainQueue`). The section row's own `fillQueued` wins.
   */
  const fillQueued = $derived.by((): 'up' | 'down' | undefined => {
    if (p.sectionRow.fillQueued) return p.sectionRow.fillQueued
    const from = /^main\s+([a-d])$/i.exec((now.playing ?? '').trim())?.[1]?.toUpperCase()
    const to = /^main\s+([a-d])$/i.exec(next)?.[1]?.toUpperCase()
    if (!now.running || !from || !to || from === to || !/fill/i.test(now.fill ?? '')) return undefined
    return to > from ? 'up' : 'down'
  })
  /** The pads on the Sections bank: its utility pads are the transport's twins (Start / Stop, Sync Start, Sync Stop, Tap, Auto Fill). */
  const sectionsBank = $derived(
    ((p.pads.banks?.length ? p.pads.banks[p.pads.bank ?? 0] : p.pads.bankName) ?? 'Sections') === 'Sections',
  )

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

{#snippet lamp(item: BankLamp, fn: boolean)}
  <!-- A function lamp with no hue of its own lights in the lamp's lime, never white. -->
  <LampButton
    label={item.label}
    on={item.on}
    hue={fn && (item.hue === undefined || item.hue === 't' || item.hue === 'm') ? 'lamp' : item.hue}
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
  <div class="page">
    <GoldenBand size="bar-height" from="top" gap="fib-8" name="page" overlay={p.overlay ?? false}>
      <div class="leaf bar">
        <!-- The bar fills its band: the grid Stage's fixed px width is dropped. -->
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
      <GoldenBand size="control-height" times="phi" from="top" gap="fib-13" name="controls">
        <div class="leaf controls">
          <div class="transport" role="toolbar" aria-label="Transport">
            <GoldenGrid weights={TRANSPORT} name="transport">
              <SectionRow
                {...p.sectionRow}
                groups="transport"
                cells
                running={p.running}
                fading={p.fading}
                beat={p.sectionRow.beat ?? beat}
                bpm={p.sectionRow.bpm ?? now.bpm}
                {fillQueued}
                plainQueue
                stateLegend
                evenGaps
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
            class="one-touch"
            role="group"
            aria-label="One Touch Setting (OTS). Click to apply; on the Launchkey, Shift + pads 9 to 12"
          >
            <GoldenGrid weights={ONE_TOUCH} name="one touch">
              <OneTouchPicker
                cells
                hue="a"
                applied={display.styleLine.oneTouch ?? 0}
                count={display.styleLine.oneTouchCount ?? 4}
                tipAction={p.tipAction}
                onapply={p.ononetouch}
              />
            </GoldenGrid>
          </div>
        </div>
        <GoldenBand size="keys-height" from="bottom" name="keys and the rest">
          <div class="leaf keys" {@attach measureKeys}>
            <Keys {...p.keys} width={keysWidth} />
          </div>
          <GoldenBand size="label-height" from="bottom" gap="fib-5" name="status and the rest">
            <div class="leaf status">
              <StatusLine {...p.status} tipAction={p.tipAction} onclear={p.onclear} />
            </div>
            <GoldenSplit take="phi" boxes={3} from="top" gap="fib-21" name="display and band">
              <GoldenSplit take="phi3" of="length" from="bottom" name="display">
                <div class="leaf beatline">
                  <div class="beats" role="img" aria-label={beat > 0 ? `Beat ${beat} of ${beats}` : `${beats} beats, stopped`}>
                    {#each { length: beats } as _, i (i)}
                      <span
                        class="beat"
                        class:now={i + 1 === beat}
                        class:down={i === 0}
                        style:--hue="var(--{now.hue ?? 'main'})"
                        style:--glow="var(--pad-glow-{now.hue ?? 'main'})"
                        style:--faded="var(--absent-{now.hue ?? 'main'})"
                      ></span>
                    {/each}
                  </div>
                </div>
                <GoldenGrid columns={3} name="thirds">
                  <div class="third first">
                    <GoldenBand size="control-height" from="top" gap="fib-8" name="reading">
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
                      <div class="leaf chord"><ChordReadout {...now.chord} /></div>
                    </GoldenBand>
                  </div>
                  <div class="third value section">
                    <div class="stand" style:--chars={sectionChars}>
                      <SectionName label={now.playing} hue={now.hue} idle={!now.running} />
                    </div>
                    <div class="next" role="group" aria-label="Next section">
                      {#if next}
                        <span class="then">then</span>
                        <span class="swatch" style:--hue="var(--{nextHue})" aria-hidden="true"></span>
                        <span class="next-name" style:--hue="var(--{nextHue})" data-hue={nextHue}>{next}</span>
                      {/if}
                      {#if next && when}<span class="dot" aria-hidden="true">·</span>{/if}
                      {#if when}<span class="when" class:sync={!now.running && now.syncStart}>{when}</span>{/if}
                    </div>
                  </div>
                  <div class="third value tempo">
                    <div class="stand">
                      <TempoReadout
                        cells
                        unitLarge
                        bpm={now.bpm}
                        tipAction={p.tipAction}
                        ontempo={p.ontempo}
                        onplus={p.ontempoup}
                        onminus={p.ontempodown}
                        onreset={p.onstyletempo}
                      />
                    </div>
                  </div>
                </GoldenGrid>
              </GoldenSplit>
              <GoldenSplit take="octave" of="length" from="left" name="band">
                <section class="half left" aria-label="Faders">
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
                      </GroupHeader>
                    </div>
                    <GoldenGrid columns={faders.strips.length} name="strips">
                      {#each faders.strips as strip, i (strip.id)}
                        {@const part = parts.get(strip.id)}
                        {@const item = foot[i]}
                        {#snippet footOf()}
                          <span class="foot" class:cut={i === footCut - 1}>
                            {#if item === 'page'}
                              <Button
                                label={pageLabel}
                                size="cell"
                                hue="lamp"
                                name={`Fader page is ${pageLabel}: click for ${otherLabel}`}
                                tip="mixer.page"
                                tipAction={p.tipAction}
                                onpress={p.onpagebutton}
                                onlongpress={p.onpagelong}
                                onlongrelease={p.onpagerelease}
                              />
                            {:else if item}
                              {@render lamp(item, i >= footCut)}
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
                          empty
                          tip={strip.tip}
                          sound={part?.sound ?? ''}
                          soundLines={2}
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
                <section class="half right" aria-label="Knobs and pads">
                  <GoldenSplit take="minor-third" boxes={4} from="bottom" name="knobs and pads">
                    <GoldenGrid columns={8} rows={2} name="pad grid">
                      {#each p.pads.pads as pad, i (i)}
                        <div class="leaf pad">
                          <Pad
                            label={pad.label}
                            index={String(i + 1)}
                            family={pad.family}
                            state={pad.state}
                            lit={p.pads.lit ?? true}
                            tagCorner
                            transport={sectionsBank}
                            name={pad.name}
                            tip={pad.tip}
                            tipAction={p.tipAction}
                            onpress={() => p.onpadpress?.(i)}
                          />
                        </div>
                      {/each}
                    </GoldenGrid>
                    <GoldenBand size="group-header-height" from="bottom" name="pads">
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
                              shorten="ellipsis"
                              dial="phi"
                              tip="knobs.knob"
                              tipAction={p.tipAction}
                              onpress={() => p.onknobpress?.(i)}
                              onstep={(delta) => p.onstep?.(i, delta)}
                            />
                          {/each}
                        </GoldenGrid>
                      </GoldenBand>
                    </GoldenBand>
                  </GoldenSplit>
                </section>
              </GoldenSplit>
            </GoldenSplit>
          </GoldenBand>
        </GoldenBand>
      </GoldenBand>
    </GoldenBand>
  </div>
</div>

<style>
  /* The screen: the frame between fib-21 side margins and a fib-21 foot; the app bar on the top
     edge (the 20px the controls row grows by over the wireframe's 32 come from the top margin). */
  .screen {
    box-sizing: border-box;
    width: var(--screen-width);
    height: var(--screen-height);
    padding: 0 var(--fib-21) var(--fib-21);
    overflow: hidden;
    container-type: size;
    background: var(--g);
    color: var(--t);
    font-family: var(--font-sans);
  }

  /* The hero sizes, from the frame's width (registered, so they resolve here, against the screen,
     and are inherited as lengths): the chord half the display's height (the display is three phi
     boxes across the frame: 1398 / 3φ / 2 = 144 at 1440), the section and the tempo a phi step
     down (89). */
  @property --golden-hero-chord {
    syntax: '<length>';
    inherits: true;
    initial-value: 0px;
  }
  @property --golden-hero-value {
    syntax: '<length>';
    inherits: true;
    initial-value: 0px;
  }
  .page {
    width: 100%;
    height: 100%;
    --golden-hero-chord: calc(100cqw / (6 * var(--interval-phi)));
    --golden-hero-value: calc(100cqw / (6 * var(--interval-phi2)));
  }

  /* Every leaf is a size container: the tokens below measure its content box (100cqw × 100cqh). */
  .leaf,
  .third,
  .half {
    box-sizing: border-box;
    container-type: size;
  }

  /* The app bar fills its band, edge to edge across the frame. */
  .bar {
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

  /* The controls row: the transport flush left, One Touch flush right, each as wide as its cells
     (phi steps of the row's height, 100cqh), so each row adds up. */
  .controls {
    display: flex;
    justify-content: space-between;
  }
  .transport {
    flex: none;
    width: calc(
      100cqh * (var(--interval-phi3) + 2 * var(--interval-phi2) + 3 * var(--interval-phi) + var(--interval-octave))
    );
    container-type: size;
    /* Reset's gutter: the part of its octave cell past phi, and the fib-8 every key leaves, so
       Reset is one width with Fill Up, Fill Down and Fade, set apart by about a fib-21 more. */
    --reset-gap: calc(100% - 100% * var(--interval-phi) / var(--interval-octave) + var(--fib-8));
  }
  .one-touch {
    flex: none;
    width: calc(100cqh * (var(--interval-phi) + 4));
    container-type: size;
  }
  /* 1–4 a fib-8 apart: each number drawn in its square less a fib-8 on its left. */
  .screen .one-touch :global(.number.cell) {
    width: calc(100% - var(--fib-8));
    margin-left: var(--fib-8);
  }

  /* The keys fill theirs; the black keys are the keys' height over phi. */
  .keys {
    --keys-height: 100cqh;
    --keys-black-height: calc(100cqh / var(--interval-phi));
  }
  /* The status line in its label-height band. */
  .status {
    display: flex;
    align-items: center;
    overflow: hidden;
    --space-20: 100cqh;
  }

  /* The beat bar: in the phi³ step under the thirds, across the display (a fib-21 in at each
     side), standing at the step's top line: one bar a beat, each a fib-13 deep, the others faded
     in the section's hue, the current one the full hue; no outlines. The downbeat, when current,
     stands the line's full depth and glows. */
  .screen .beatline {
    padding: 0 var(--fib-21);
  }
  .beats {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: minmax(0, 1fr);
    align-items: start;
    column-gap: var(--fib-5);
    height: var(--label-height);
  }
  .beat {
    height: var(--fib-13);
    background: var(--faded);
  }
  .beat.now {
    background: var(--hue);
  }
  .beat.down.now {
    height: var(--label-height);
    box-shadow: var(--glow);
  }

  /* A third: inset a fib-21 from its cuts (no inset at its foot: the beat bar's step is the gap). */
  .screen .third {
    padding: var(--fib-21) var(--fib-21) 0;
    --golden-inset: 0px;
  }
  /* The section and the tempo: their capitals topped on the chord's, under the style line's band
     and its fib-8, so the three hero values share one top line. */
  .screen .third.value {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    padding-top: calc(var(--fib-21) + var(--control-height) + var(--fib-8));
    --type-poster: var(--weight-light) var(--golden-hero-value) / var(--golden-hero-value) var(--font-sans);
    --tracking-poster: var(--tracking-hero);
  }

  /* The style line: the first third's header, a control-height band. */
  .style {
    display: flex;
  }

  /* The chord at half the display's height, its capitals' top on the row's top line (the hero
     face's baseline sits 0.0815 of its 128 / 104 line above the line's foot and its capitals are
     0.70 of its size, measured), its notes a fib-8 under its baseline. */
  .chord {
    display: block;
    --cap-font: var(--golden-hero-chord);
    --stage-row-width: calc(3 * 100cqw);
    --display-pad-left: 0px;
    --display-border-width: 0px;
    --display-thirds-gap: 0px;
    --hero-height: calc(var(--cap-font) * 104 / 128);
    --type-hero: var(--weight-light) var(--cap-font) / var(--hero-height) var(--font-sans);
  }
  .chord > :global(*) {
    margin-top: calc(var(--cap-font) * 0.7 - var(--hero-height) * (1 - 0.0815));
  }
  .chord :global(.line) {
    margin-top: calc(var(--fib-8) - var(--hero-height) * 0.0815);
  }

  /* Main B: its box trimmed to its capitals, so it tops on the shared line and "then …" sits a
     fib-8 under its baseline. A long name ("Ending III") steps down to fit its third: at most the
     third's width over its characters at 0.52 em a character (the face's widest names, measured). */
  .section .stand > :global(*) {
    text-box: trim-both cap alphabetic;
  }
  .section .stand {
    display: flex;
    --type-poster: var(--weight-light) min(var(--golden-hero-value), 100cqw / (var(--chars) * 0.52)) / 1 var(--font-sans);
  }
  /* What comes next, Main B's subtitle: a sentence on the small line a fib-8 under Main B, flush
     with its left edge: "then" in the text ink, a short solid bar in the next section's hue (the
     signal), the next section in its hue at the strong weight, "·", when it lands. No outline, no
     box: it is a display, not a control. */
  .next {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    height: var(--label-height);
    margin: var(--fib-8) 0 0;
    white-space: nowrap;
    font: var(--type-text);
    letter-spacing: var(--tracking-text);
    color: var(--t);
  }
  .then {
    color: var(--t);
  }
  .swatch {
    flex: none;
    width: var(--fib-21);
    height: var(--fib-5);
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

  /* The tempo: "104 BPM" and + over − standing on one baseline, the stand exactly the numeral's
     capitals deep, so the numeral tops on the shared line. */
  .tempo .stand {
    display: flex;
    flex: none;
    align-items: flex-end;
    height: calc(var(--golden-hero-value) * 0.7);
  }

  /* The band's halves: a fib-21 gutter between them, half on each side of the cut. */
  .half {
    --golden-inset: 0px;
  }
  .screen .half.left {
    padding-right: calc(var(--fib-21) / 2);
  }
  .screen .half.right {
    padding-left: calc(var(--fib-21) / 2);
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

  /* A strip's foot: its lamp (or the page button) filling the strip's lamp band; the last part
     lamp stops a fib-13 sub-cut short, so a function never reads as a part's state. */
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
  }

  /* A pad fills its cell, less the pads' gap. */
  .screen .pad {
    padding: calc(var(--pad-gap) / 2);
    --pad-width: 100cqw;
    --pad-height: 100cqh;
  }
</style>
