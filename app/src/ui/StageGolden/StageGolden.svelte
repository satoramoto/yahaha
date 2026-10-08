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
    part off the left the transport (seven glyph keys in the hue of time, a glyph over each word,
    the glyph showing the state, every word on one baseline, every glyph a 21px square on one
    foot: Start / Stop's cell phi² units (▶ outlined stopped, ■ solid playing); then the cells of
    Sync Start, Accomp, Fill Up, Fill Down and Fade 1 each and ⟲ Reset's a major third, with the
    six keys over them one width, a fib-8 apart (designer pass; armed keys outlined and pulsing on
    the beat, a queued Fill plain off, Fade's wedge draining as it fades); the tier's groups
    a fib-8 in from its top and foot), the rest One Touch in the style's violet (its caption a
    narrow label cell, then 1–4, each phi² against the caption's octave). The
    reading tier (215) above it, one group, reads style → chord → section → next: a control-height
    band off its top is the style line (the category and metre right after ›), a fib-8 over the
    rest; under it, a quarter (a double-octave step) off the left is the chord (343), the rest
    halved into the section and the tempo (515 each). Each reading cell is a hero row over one
    small line: the chord, Main B and the tempo are one size, their capitals filling the row,
    capped so "Am7" fits the chord's column (116 at 1440), on one shared line, flush left. A fib-8
    under it, one small line across: the chord's notes; what comes next, Main B's subtitle ("then
    ▬ Main C · fill after bar 4", the bar and Main C in its hue; a display, not a control); the
    beat bar (fib-13 bars, faded, the current beat the full hue, the downbeat taller and glowing
    when current). "BPM" at the large role (32px) in the numeral's white, on its baseline, a
    fib-13 after it and a fib-21 before + − (designer pass). + over − are one column beside the tempo, exactly its cap height, two squares
    with a hard fib-8 gap between them (54 each at 1440), + and − at the numeral's stroke weight,
    in the hue of time. The function lamps and the page button light in the lamp's lime; the
    Sections bank's utility pads (the transport's twins) in the hue of time.
  - Band (1398 × 456), halved (round 8: eight whole knob names need 68 px a cell at 1280, and only
    half the band gives it): its left half is the faders (699): a header band over nine strips,
    each with its own foot (the part lamps under the part strips, then a sub-cut and the functions
    and the page button), so every lamp sits on its fader's column. The right half (699) is cut
    minor off the top into knobs (a header band over eight knob cells of one width, 84 px at 1440
    and 74 at 1280, assigned or not, each dial the cell over phi, 52 px and 46 (designer pass),
    each value under its dial and the name on one line under that, each cut short with an ellipsis
    a fib-8 short of the cell, the full name in the title) over pads (a header band over a 4 × 4
    grid; the queued pad's NEXT a corner tag, so the pad stays one line). Each part's sound sits
    on its strip in the part's hue, centred, the strip less 6px wide, wrapping to two lines before
    an ellipsis (FaderCell `soundLines`, designer pass); a parked strip is a dotted ghost in
    the faded hue (no track, no rails: absent things look absent).
  Each group sits in a `group` wrapper inset fib-13 from its block's cuts; inside a group the cuts
  sit edge to edge. The status line sits at the faders header's right end.
  Each leaf is a size container: the components' size tokens are set from its content box (cq
  units). It changes no component's default: it uses their additive props (SectionRow,
  OneTouchPicker, StyleLine and TempoReadout `cells`, OneTouchPicker `hue`, Pad `tagCorner` and
  `transport`, AppBar `end`, FaderCell `sound` and `lamp`). With
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
  /**
   * Every knob cell one width, assigned or not (round 7: the row only worked while one knob was
   * unassigned and shrunk; with all eight assigned, the usual case, dials and names collided). The
   * dial is the cell over phi (52 px at 1440, designer pass: the round 8 dials left 4–14 px
   * between knobs), and the value and the name are one line each, cut short with an ellipsis a
   * fib-8 short of the cell, the full name in the title (KnobCell `dial="phi"`,
   * `shorten="ellipsis"`).
   */
  const knobWeights: Interval[] = $derived(p.knobs.knobs.map(() => 'unison'))
  /**
   * The transport (glyph keys in the hue of time: SectionRow `cells`) graded by use AND
   * consequence together, in the order of its groups, [Start / Stop · Sync Start] [Accomp]
   * [Fill Up · Fill Down · Fade] [Reset]: Start / Stop (a slip starts or stops the band) two golden
   * steps over one unit (phi² units), so it reads as the lead at a glance; Sync Start, Accomp, each
   * Fill and Fade 1 each; Reset's cell a major third (5/4) at the far end, its fifth a gutter
   * before it (a slip onto it is heard): Reset is 1 unit behind a quarter unit, about a fib-21
   * (24 px at 1440, 21 at 1280). The cuts stay; the keys over them do not (designer pass,
   * SectionRow `evenKeys`): Start / Stop keeps its key, and the six after it are one width, a
   * fib-8 apart, spread over the cells after it (Reset's gutter folded in), every glyph a 21px
   * square on one foot.
   */
  const TRANSPORT: Interval[] = ['phi2', 'unison', 'unison', 'unison', 'unison', 'unison', 'major-third']
  /**
   * A queued fill: what comes next lands after a fill ("fill after bar 4"), from one Main to
   * another, so Fill Up (to a later Main) or Fill Down is queued: said in its spoken name, its face
   * plain off (SectionRow `plainQueue`, designer pass: a fill is never latched, and the armed face
   * read as a third state). The section row's own `fillQueued` wins.
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
  /**
   * One Touch: its caption a narrow cell (a label, not a button-sized ghost), an octave against
   * each of 1–4's phi² (81 px caption, 107 px buttons at 1440; 72 and 94 at 1280, where "One Touch"
   * still keeps a fib-8 before 1).
   */
  const ONE_TOUCH: Interval[] = ['octave', 'phi2', 'phi2', 'phi2', 'phi2']

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
            <div class="group tier transport" role="toolbar" aria-label="Transport">
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
                  evenKeys
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
              class="group tier"
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
          </GoldenSplit>
          <div class="group">
            <GoldenBand size="control-height" from="top" gap="fib-8" name="reading">
              <div class="leaf style">
                <StyleLine {...style} cells tipAction={p.tipAction} onprev={p.onprev} onnext={p.onnext} onbrowse={p.onbrowse} />
              </div>
              <GoldenSplit take="double-octave" of="length" from="left" name="now">
                <div class="leaf reading chord"><ChordReadout {...now.chord} /></div>
                <div class="split" data-golden-name="section and tempo">
                  <div class="leaf reading section">
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
                  <div class="leaf reading tempo">
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
                </div>
              </GoldenSplit>
            </GoldenBand>
          </div>
        </GoldenSplit>
      </GoldenSplit>
      <GoldenSplit take="phi4" of="length" from="bottom" name="bottom half">
        <div class="leaf keys" {@attach measureKeys}>
          <Keys {...p.keys} width={keysWidth} />
        </div>
        <GoldenSplit take="octave" of="length" from="left" name="band">
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

  /* The controls tier's groups (transport, One Touch) sit a fib-8 in from the tier's top and foot
     (fib-13 at the sides, as every group): a transport key holds a glyph band (--glyph-key, 21)
     a fib-5 over its word's capitals (9), 35 px, and the tier's phi³ step leaves a key 41 px at
     1440 and 33 at 1280 with fib-13 insets, too short at 1280; with fib-8 the key is 51 and 43.
     The reading tier's fib-13 foot and this fib-8 make a fib-21 gutter between the tiers. */
  .screen .tier {
    padding-block: var(--fib-8);
  }

  /* Reset's gutter: its cell's fifth (the cell is a major third, 5/4 units, so Reset keeps 1). */
  .transport {
    --reset-gap: calc(100% - 100% / var(--interval-major-third));
    /* Reset's cell in units, for SectionRow `evenKeys`. */
    --reset-units: var(--interval-major-third);
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
     the shared line every hero value stands on, flush left; then one small line a fib-8 under
     it, one cut line across all three: the chord's notes, what comes next (Main B's subtitle) and
     the beat bar. The three heroes are one size, the size whose capitals fill the row
     (--cap-font: the face's capitals are 0.70 of its size, measured), so the row holds no empty
     band over them and the tempo's + − square (its side the cap height) is big enough to hit. A
     fib-13 gutter before the next cut.
     The row is capped where the chord's column would no longer hold a three-glyph chord at the
     heroes' size ("Am7" is 1.94 em): the heroes' em is at most half the chord's room (its column
     less a fib-13 gutter, --chord-room, set per cell below). Where the cap binds (at 1440 the row
     is 116 of 125; at 1280 it doesn't), the rest of the cell lies under the small line, in the
     gutter before the controls, never over the heroes. */
  .reading {
    --next-gap: var(--fib-8);
    --chord-room: calc(100cqw - var(--fib-13));
    --row: min(calc(100cqh - var(--label-height) - var(--next-gap)), var(--chord-room) * 0.35);
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
  /* The section and the tempo (round 7): the tempo's cell is as wide as what it holds (the numeral,
     its unit and the + − column, a max-content column), ending on the frame's right edge, and the
     section takes the rest, so no cell holds a void and Main B and what comes next have the room.
     `.split` measures the row it sits in (the reading row less the chord's quarter): the chord's
     room is its column (a quarter of that row) less a fib-13 gutter, and the heroes' row
     (--golden-hero-row) follows from it as in every reading cell; it is computed here (a
     registered length, so the row's units resolve here) and inherited, since the tempo's cell is
     not a size container (it sizes to its content). */
  @property --golden-hero-row {
    syntax: '<length>';
    inherits: true;
    initial-value: 0px;
  }
  .split {
    display: grid;
    grid-template-columns: minmax(0, 1fr) max-content;
    container-type: size;
    --golden-hero-row: min(
      calc(100cqh - var(--label-height) - var(--fib-8)),
      calc((100cqw / 4 - var(--fib-13)) * 0.35)
    );
  }
  .split > .reading {
    --row: var(--golden-hero-row);
  }
  .split > .tempo {
    container-type: normal;
  }
  /* The chord and the section read as two words, not one (designer pass): a gap of half the
     heroes' row between the chord's block and the section's (58 at 1440, scaling with the cut),
     the chord's fib-13 gutter plus this inset; the section and its "then …" line move together. */
  .split > .section {
    padding-left: calc(var(--golden-hero-row) / 2 - var(--fib-13));
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
  /* What comes next, Main B's subtitle: a sentence on the small line a fib-8 under Main B, flush
     with its left edge: "then" in the text ink, a short solid bar in the next section's hue (the
     signal), the next section in its hue at the strong weight, "·", when it lands. No outline, no
     box: it is a display, not a control. */
  .next {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    height: var(--label-height);
    margin: 0;
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
  /* The beat bar, a display read from across the room: one bar a beat in the line a fib-8 under
     the tempo, each a fib-13 deep; the others faded in the section's hue, the current one the full
     hue; no outlines. The downbeat, when it is the current beat, stands the line's full depth and
     glows, so "one" reads apart from the rest. */
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

  /* A strip's foot: its lamp (or the page button) filling the strip's lamp band; the last part
     lamp stops a fib-13 sub-cut short, so a function never reads as a part's state. The sub-cut
     comes off the part lamp ("On", "Off"), not the first function, whose word ("Harm/Arp") needs
     the strip's whole width at 1280 (round 8: the band is halved). */
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
