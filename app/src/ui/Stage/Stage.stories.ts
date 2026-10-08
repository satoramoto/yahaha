import type { Meta, StoryObj } from '@storybook/svelte-vite'
import { createRawSnippet } from 'svelte'
import { expect, fn, waitFor } from 'storybook/test'
import Stage from './Stage.svelte'
import { stageBoard, stageStopped } from './Stage.fixtures'
import StagePlayground from './StagePlayground.svelte'

/** Groups a callback's control under its component. */
const on = (category: string, names: string[]) =>
  Object.fromEntries(names.map((name) => [name, { table: { category } }]))

const CALLBACKS: Record<string, string[]> = {
  AppBar: ['onchoose', 'onhealth'],
  SectionRow: [
    'onstartstop',
    'onaccomp',
    'onsyncstart',
    'onreset',
    'onfillup',
    'onfilldown',
    'onfade',
    'onmetronome',
    'onmetronomesettings',
    'onunison',
    'onpanic',
    'onhelp',
  ],
  Display: [
    'onprev',
    'onnext',
    'onbrowse',
    'ononetouch',
    'onsound',
    'ontempoup',
    'ontempodown',
    'onstyletempo',
    'ontempo',
  ],
  FaderBank: [
    'onchoosePage',
    'onchooseLayer',
    'onlevel',
    'onopen',
    'onlamp',
    'onlamplong',
    'onlamprelease',
    'onpagebutton',
    'onpagelong',
    'onpagerelease',
  ],
  KnobBank: ['onknobpage', 'onknobpress', 'onstep'],
  PadBank: ['onpadbank', 'onpadpress'],
  StatusLine: ['onclear'],
  // Accepted so the wiring branch still type-checks; nothing on the Stage calls them now.
  Unused: ['onstop', 'onstoplong', 'onpageup', 'onpagedown', 'onbankup', 'onbankdown', 'onsends', 'onrack', 'onpart'],
}

const actions = Object.fromEntries(Object.values(CALLBACKS).flatMap((names) => names.map((name) => [name, fn()])))

/**
 * The Stage page at the app's 1440 × 900: the app bar, the section row (transport at its left), the
 * display in thirds (harmony, song, parts), the hardware band (faders; knobs above pads), the
 * status line and the keys. Each region's data is
 * one object control; every callback is an action, grouped under its component.
 */
const meta = {
  title: 'Screens/Stage',
  component: Stage,
  parameters: { layout: 'fullscreen' },
  args: { ...stageBoard, tipAction: fn(), ...actions },
  argTypes: {
    layout: { control: 'inline-radio', options: ['grid', 'golden'], table: { category: 'Layout' } },
    overlay: { control: 'boolean', table: { category: 'Layout' } },
    appBar: { control: 'object', table: { category: 'AppBar' } },
    sectionRow: { control: 'object', table: { category: 'SectionRow' } },
    display: { control: 'object', table: { category: 'Display' } },
    faders: { control: 'object', table: { category: 'FaderBank' } },
    knobs: { control: 'object', table: { category: 'KnobBank' } },
    pads: { control: 'object', table: { category: 'PadBank' } },
    status: { control: 'object', table: { category: 'StatusLine' } },
    keys: { control: 'object', table: { category: 'Keys' } },
    ...Object.assign({}, ...Object.entries(CALLBACKS).map(([category, names]) => on(category, names))),
  },
} satisfies Meta<typeof Stage>

export default meta
type Story = StoryObj<typeof meta>

/** The dark board: Am7 in Main B, Main C next, running at 104; split F#2 with the left hand's Am7 held. */
export const Board: Story = {}

/** Stopped with a style queued, the faders on the Reverb layer, a message on the status line. */
export const Stopped: Story = {
  args: { ...stageStopped },
}

/**
 * Play with the screen: the controls respond. It starts from the board, and a story-only wrapper
 * (`StagePlayground.svelte`) keeps what you change; editing a control re-seeds that region. Every
 * press still logs in the Actions panel.
 *
 * - Page tabs, fader page and layer tabs, and the Panel page button switch; on a layer other than
 *   Vol, strips 1–4 show that layer's values ("Rev 40", "Pan L24"), each layer keeping its own.
 * - The knob page tabs switch the eight knobs (each page keeps its own values); the pad bank tabs
 *   switch the sixteen pads (Sections is the stateful one; the other banks' pads toggle).
 * - Faders drag, knobs turn (the Tempo knob is the tempo), lamps toggle: Accomp, Sync Start (the
 *   same switch as pad 4), Metronome (and its ▾), Unison, ?, the part lamps (an Off part dims its
 *   strip and sound) and the function lamps.
 * - Pads, no timers: stopped, a Main or Break plays at once, an Intro or Ending arms. Running, a
 *   section pad is queued (NEXT); press it again and it lands; a landed Ending stops the band. Start
 *   plays the armed pad and queues the Main that was playing; Stop clears what was queued or armed.
 *   Auto Fill and Sync Stop toggle.
 * - Start / Stop (the section row's or pad 16) swaps the display between the board and the stopped
 *   display; while running, a story-only ticker in this wrapper moves the beat bar at the tempo
 *   (the components hold no timers). Fade toggles; Reset and Fill ▲ ▼ write a status line.
 * - Tempo: + and − on the display step it, dragging or scrolling on the number sets it, ↑ ↓ step it
 *   with focus, and a double-click goes back to the style's 104.
 * - One Touch applies, ‹ › step through a few styles (a 3/4 waltz among them: three beat segments),
 *   a part's row steps through a few sounds, Panic writes a status line, a click clears it.
 */
export const Playground: Story = {
  render: (args) => ({ Component: StagePlayground, props: args }),
}

/**
 * The board with `overlay` on: the layout grid every region sits on.
 *
 * - **The grid** (tokens/grid.css): 15 columns of 76px with an 18px gutter inside the 24px margins
 *   (15 divides into thirds and fifths), and a 6px rhythm (900 = 150 × 6; the margin is 4 units,
 *   the gutter 3).
 * - **Rows**, in rhythm units: margin 4, app bar 6, gap 2, section row 4, gap 2, display 48, gap 4,
 *   band 62, status line 4, keys 10, margin 4.
 * - **Section row** (`look: 'dots'`): a dot and a word per switch, plain words for actions,
 *   "● Playing" / "○ Stopped". The transport starts on column 1; the helpers end on column 15.
 * - **Display**: the thirds are exactly columns 1-5, 6-10 and 11-15, with one top line for the
 *   style line, the section and the first part row; the beat bar spans 1-15.
 * - **Band**: faders on columns 1-9 (3/5), one strip per column; knobs over pads on 10-15 (2/5).
 *   Every header starts on a column line.
 * - **Keys**: the full width, margin to margin.
 */
export const Grid: Story = {
  args: { overlay: true },
}

/** A placeholder page for the slot: a dashed box that fills `--page-width` × `--page-height`. */
const placeholderPage = createRawSnippet(() => ({
  render: () =>
    `<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; box-sizing: border-box; width: var(--page-width); height: var(--page-height); border: 1px dashed var(--d); color: var(--m); font-size: 14px;">` +
    `<strong style="color: var(--t); font-size: 20px; font-weight: 400;">Page slot</strong>` +
    `<span>A display page fills this box: --page-width × --page-height (1392 × 288).</span></div>`,
}))

/**
 * A display page in the Stage's display box (`page`, a snippet), in place of the Display: here a
 * placeholder. The app bar, section row, band, status line and keys stay as on the Stage; the band
 * never changes height. The box sets `--page-width` and `--page-height` for the page to lay out
 * against (1392 × 288 on the grid). The app passes Channel, Effects, Quick Racks, Multi Pads, Looper
 * or Harm/Arp here (panels/stage/StageScreen.svelte).
 */
export const PageSlot: Story = {
  name: 'Page slot',
  args: { page: placeholderPage, appBar: { ...stageBoard.appBar, chosen: 'effects' } },
}

/**
 * A proposal: the Stage laid out as a Golden tree (`layout="golden"`, StageGolden, built from the
 * Golden primitives), here at 1440 × 900. Every size comes from a cut, and the cuts recurse: the page
 * lays out groups, each group lays out its items, each control is a frame again. Turn on `overlay`
 * to see every level.
 *
 * - **Page**: the whole screen is the frame, a phi box (1398 × 864) between fib-21 margins. Its
 *   minor part off the top is the top half (330), the rest the bottom half (534); each half takes a
 *   phi⁴ step off its outer edge: the app bar (48: the page tabs, the helpers Metronome ▾, Unison,
 *   Panic, ?, the Launchkey and audio health) and the keys (78).
 * - **Hero** (1398 × 282), two tiers. The controls tier is a phi³ step off its bottom (67): its
 *   major part the transport, seven glyph keys in the hue of time (cyan, shared with the tempo's
 *   + −, the metronome and the Sections bank's utility pads), each a glyph over its word, the glyph
 *   showing the state, every word on one baseline, every glyph a 21px square on one foot (Start /
 *   Stop phi² units, ▶ outlined or ■ solid; then Sync Start, Accomp, Fill Up, Fill Down, Fade and
 *   ⟲ Reset one width each, a fib-8 apart, armed keys pulsing on the beat; a queued Fill stays
 *   plain off, its queue in its name), the rest One Touch in
 *   the style's violet (its caption a narrow label cell, then 1–4). The reading tier above (215) reads style → chord → section → next: the style line (‹
 *   name › as 32px squares, then category · metre right after ›) in a control-height band, a fib-8
 *   over the chord, a quarter off its left, then the section and the tempo (halves). Chord, Main B
 *   and the tempo are one size, their capitals filling the row (capped so "Am7" fits its column),
 *   on one shared line, flush left. A fib-8 under it, one small line across: the chord's notes;
 *   what comes next as Main B's subtitle ("then ▬ Main C · fill after bar 4", the bar and "Main C"
 *   in its hue: a display, not a control); the beat bar (fib-13 bars, faded, the current beat the
 *   full hue, the downbeat taller and glowing when current). "BPM" is 32px (the large role)
 *   in the numeral's white, on its baseline, a fib-13 after it and a fib-21 before + −. +
 *   over − are one column beside the tempo, exactly its cap height, two squares with a hard fib-8
 *   gap between. No parts block: each part's sound is on top of its own fader strip
 *   (Option C), in the part's hue, centred, wrapping to two lines before an ellipsis.
 * - **Band** (1398 × 456), halved (round 8): its left half the faders (a header band, the status
 *   line at its right end; nine strips, each with its own foot: the part lamps under strips 1–4,
 *   then a sub-cut and the functions and the page button under strips 5–9; a parked strip is full
 *   width, so its button's word fits, drawn as a dotted ghost in the faded hue: absent, not live at
 *   zero); the right half knobs (its minor part, on top: a header band over eight knob cells of one
 *   width, assigned or not, each dial as big as the cell allows less a fib-13 gutter, its value
 *   under it, its whole name on one line under that, at 1440 and at 1280; where a name still
 *   doesn't fit, its first word, never a full stop or a code) over pads (a header
 *   band over a 4 × 4 grid; the queued pad's NEXT a corner tag, so the pad reads one line).
 * - **Groups**: each group is inset fib-13 from its block's cuts; inside it the cuts sit edge to
 *   edge. Size tokens come from each leaf's box (container query units). Every cell has a job; the
 *   control fills its cell.
 * - **Spiral**: the page's spiral is turned cw from the right, so its pole (ringed in the overlay)
 *   lands on the section block, on what comes next.
 */
export const Golden: Story = {
  args: { layout: 'golden', overlay: false },
}

/**
 * The golden layout with `overlay` on: a GoldenOverlay draws every level's cuts, each nesting depth
 * in its own shade, each leaf's inset (dashed) and a spiral in every phi box and golden cut, turned
 * to its cut's side; it draws red whatever breaks a rule (a row whose cells don't add up, a slot
 * whose content overflows).
 */
export const GoldenOverlay: Story = {
  name: 'Golden › overlay',
  args: { layout: 'golden', overlay: true },
  play: async ({ canvasElement }) => {
    const overlay = canvasElement.querySelector('[data-golden="overlay"]')
    await expect(overlay).not.toBeNull()
    await waitFor(() => expect(overlay?.getAttribute('data-rows-off')).toBe('0'))
    // The halves each take a phi⁴ step off their outer edge: the app bar and the keys.
    const steps = canvasElement.querySelectorAll('[data-golden-slots="cut"][data-take="phi4"][data-of="length"]')
    await expect([...steps].map((s) => s.getAttribute('data-from'))).toEqual(['top', 'bottom'])
    // The hero holds no parts block (Option C): each part's sound is on its fader strip.
    await expect(canvasElement.querySelector('[data-golden-name="hero"] [aria-label$="Opens the quick sound list"]')).toBeNull()
    const strips = canvasElement.querySelector('[data-golden-name="strips"]')
    await expect(strips?.querySelectorAll('[aria-label$="Opens the quick sound list"]').length).toBe(4)
    // The transport is seven cells graded by use and consequence: Start / Stop phi² units (its
    // legend the action), Sync Start, Accomp, Fill Up, Fill Down and Fade a unit each, Reset last
    // behind a quarter-unit gutter (its cell a major third).
    const transport = canvasElement.querySelector('[data-golden-name="transport"] [data-golden-slots="grid"]')
    await expect(transport?.children.length).toBe(7)
    await expect(transport?.getAttribute('data-weights')).toBe('phi2 unison unison unison unison unison major-third')
    // One Touch's caption is a narrow label cell, not a button-sized one: 1–4 take the width.
    const oneTouch = canvasElement.querySelector('[data-golden-name="one touch"] [data-golden-slots="grid"]')
    await expect(oneTouch?.getAttribute('data-weights')).toBe('octave phi2 phi2 phi2 phi2')
    await expect(oneTouch?.firstElementChild?.tagName).toBe('SPAN')
    await expect(transport?.firstElementChild?.textContent?.trim()).toBe('Start / Stop')
    await expect(transport?.lastElementChild?.getAttribute('aria-label')).toMatch(/^Section reset/)
    // The page's spiral is turned to put its pole on the section block.
    const page = canvasElement.querySelector('[data-golden-name="page"] [data-golden-slots]')
    await expect([page?.getAttribute('data-spiral-from'), page?.getAttribute('data-spiral-turn')]).toEqual(['right', 'cw'])
    // The style line heads the reading tier, over the chord.
    const reading = canvasElement.querySelector('[data-golden-name="reading"] [data-golden-slots="cut"]')
    await expect(reading?.firstElementChild?.querySelector('[aria-label="Previous style (Track left)"]')).not.toBeNull()
    // Each strip carries its own foot (one module a strip): nine strips, nine lamps or buttons.
    const stripGrid = canvasElement.querySelector('[data-golden-name="strips"] [data-golden-slots="grid"]')
    await expect(stripGrid?.children.length).toBe(9)
    for (const strip of stripGrid?.children ?? []) await expect(strip.querySelector('[data-band="control-height"] button')).not.toBeNull()
    // What comes next reads as a sentence with its signal, "then ▬ Main C · …": "then" in the text
    // ink, a short solid bar in the section's hue, the section in its hue; not a control: no
    // outline, no button.
    const next = canvasElement.querySelector('[aria-label="Next section"]')
    await expect(next?.firstElementChild?.textContent).toBe('then')
    await expect(next?.children[1]?.classList.contains('swatch')).toBe(true)
    await expect(next?.querySelector('[data-hue="main"]')?.textContent).toBe('Main C')
    await expect(next?.querySelector('button, [data-face]')).toBeNull()
    // The queued pad keeps one line: NEXT is a corner tag, not a line over "Main C".
    await expect(canvasElement.querySelector('[data-golden-name="pad grid"] .tag.corner')?.textContent).toBe('NEXT')
    // The style's category and metre follow its name on the style line.
    const styleLine = reading?.firstElementChild
    await expect(styleLine?.querySelector('.name + .glyph + .meta')?.textContent).toBe('Pop & Rock · 4/4')
    // The knobs: every cell one width, assigned or not; each value under its dial (not in the
    // ring) and the name on one line under it.
    const knobRow = canvasElement.querySelector('[data-golden-name="knob row"] [data-golden-slots="grid"]')
    await expect(knobRow?.getAttribute('data-weights')).toBe('unison unison unison unison unison unison unison unison')
    for (const knob of knobRow?.children ?? []) {
      await expect(knob.querySelector('[data-band="label-lines-2"]')).toBeNull()
      await expect(knob.querySelector('.ring-value')).toBeNull()
      await expect(knob.querySelector('.text.value')).not.toBeNull()
    }
    // A parked strip is a dotted ghost in the faded hue: no track, no meter rails.
    const parked = stripGrid?.querySelectorAll('.fader[data-kind="parked"]')
    await expect(parked?.length).toBe(2)
    for (const fader of parked ?? []) {
      await expect(fader.classList.contains('empty')).toBe(true)
      await expect(fader.querySelector('.meter-bg')).toBeNull()
    }
    // Real layout only (jsdom has none): Tempo + and − each at least 48px on their short side; the
    // next section a fib-8 under Main B, flush with its left edge; the transport's keys.
    const plus = canvasElement.querySelector('[aria-label="Tempo up (Scene Launch)"]')?.getBoundingClientRect()
    if (plus && plus.height > 0) {
      await expect(Math.min(plus.width, plus.height)).toBeGreaterThanOrEqual(48)
      const section = canvasElement.querySelector('.section .stand')?.getBoundingClientRect()
      const line = next?.getBoundingClientRect()
      await expect(Math.round((line?.top ?? 0) - (section?.bottom ?? 0))).toBe(8)
      await expect(Math.round((line?.left ?? 0) - (section?.left ?? 0))).toBe(0)
      // The chord and the section read as two words: at least a fib-55 between "Am7" and Main B.
      const chordText = document.createRange()
      chordText.selectNodeContents(canvasElement.querySelector('.leaf.chord .chord') as Node)
      await expect((section?.left ?? 0) - chordText.getBoundingClientRect().right).toBeGreaterThanOrEqual(55)
      // Each part's sound centred over its own strip, at most the strip less 6px, wrapping to two
      // 13px lines ("Brass Section" whole on two) before any ellipsis.
      for (const strip of [...(stripGrid?.children ?? [])].slice(0, 4)) {
        const s = strip.getBoundingClientRect()
        const text = strip.querySelector('.sound .lines') as HTMLElement
        const t = text.getBoundingClientRect()
        await expect(t.width).toBeLessThanOrEqual(s.width - 6 + 0.5)
        await expect(Math.abs((t.left + t.right) / 2 - (s.left + s.right) / 2)).toBeLessThan(1)
        await expect(getComputedStyle(text).fontSize).toBe('13px')
        await expect(text.scrollHeight).toBeLessThanOrEqual(text.clientHeight + 1)
      }
      const [start, sync, accomp, up, down, fade, reset] = [...(transport?.children ?? [])].map((c) =>
        c.getBoundingClientRect(),
      )
      // The six keys after Start / Stop one width, a fib-8 apart (designer pass); Reset ends on
      // the row's end.
      const six = [sync, accomp, up, down, fade, reset]
      const all = [start, ...six]
      const gaps = six.map((k, i) => k.left - all[i].right)
      await expect(gaps.map(Math.round)).toEqual([8, 8, 8, 8, 8, 8])
      for (const k of six) await expect(Math.abs(k.width - sync.width)).toBeLessThan(0.5)
      const row = transport?.getBoundingClientRect()
      await expect(Math.abs(reset.right - (row?.right ?? 0))).toBeLessThan(0.5)
      // Start / Stop keeps its key: its cell phi² of a unit, the cells after it 6¼ units.
      await expect((start.width + 4) / (((row?.width ?? 0) - start.width - 4) / 6.25)).toBeCloseTo(2.618, 1)
      // Every glyph a 21px square, on one foot.
      const marks = [...(transport?.querySelectorAll('.mark') ?? [])].map((m) => m.getBoundingClientRect())
      for (const m of marks) {
        await expect([Math.round(m.width), Math.round(m.height)]).toEqual([21, 21])
        await expect(Math.abs(m.bottom - marks[0].bottom)).toBeLessThan(0.5)
      }
      // No dead band over the heroes: they start a fib-8 under the style line.
      const styleBand = reading?.firstElementChild?.getBoundingClientRect()
      await expect(Math.round((section?.top ?? 0) - (styleBand?.bottom ?? 0))).toBe(8)
      // The beat bar reads from across the room: each bar a fib-13 deep.
      await expect(canvasElement.querySelector('.beat:not(.now)')?.getBoundingClientRect().height).toBe(13)
      // One shared baseline: every transport word has the same foot, and every glyph band the same
      // top; the + / − column has a hard fib-8 gap, each half at least a transport key's height.
      const words = [...(transport?.querySelectorAll('.key-word') ?? [])].map((w) => w.getBoundingClientRect())
      await expect(words).toHaveLength(7)
      for (const w of words) await expect(Math.abs(w.bottom - words[0].bottom)).toBeLessThan(0.5)
      const bands = [...(transport?.querySelectorAll('.band') ?? [])].map((b) => b.getBoundingClientRect())
      for (const b of bands) await expect(Math.abs(b.top - bands[0].top)).toBeLessThan(0.5)
      const minus = canvasElement.querySelector('[aria-label="Tempo down (Function)"]')?.getBoundingClientRect()
      await expect(Math.round((minus?.top ?? 0) - plus.bottom)).toBe(8)
      await expect(plus.height).toBeGreaterThanOrEqual(accomp.height)
    }
    // The transport's keys are glyph keys in the hue of time, one glyph on every key (the state in
    // the glyph: ■ while playing), each Fill its own key and word; on the board Main C lands after
    // a fill, so Fill Up is queued: said in its name, its face plain off (designer pass: no third
    // state).
    const glyphs = [...(transport?.querySelectorAll('.band') ?? [])].map((b) => b.querySelectorAll('svg').length)
    await expect(glyphs).toEqual([1, 1, 1, 1, 1, 1, 1])
    const keys = [...(transport?.children ?? [])]
    await expect(keys.map((k) => k.querySelector('.key-word')?.textContent)).toEqual([
      'Start / Stop',
      'Sync Start',
      'Accomp',
      'Fill Up',
      'Fill Down',
      'Fade',
      'Reset',
    ])
    await expect(keys[3]).toHaveAttribute('data-face', 'off')
    await expect(keys[3]).toHaveAccessibleName(/^Fill Up, queued/)
    for (const key of keys) await expect((key as HTMLElement).style.getPropertyValue('--hue')).toBe('var(--transport)')
    // One hue a meaning, shared with the pads: the Sections bank's utility pads (the transport's
    // twins) in the hue of time, Start / Stop too; One Touch in the style's violet; the function
    // lamps and the page button in the lamp's lime; nothing clickable outlined white.
    const padGrid = canvasElement.querySelector('[data-golden-name="pad grid"]')
    const twins = [...(padGrid?.querySelectorAll('button') ?? [])].filter((b) =>
      ['Sync Start', 'Auto Fill', 'Tap', 'Sync Stop'].includes(b.textContent?.trim() ?? ''),
    )
    await expect(twins).toHaveLength(4)
    for (const pad of twins) await expect(pad).toHaveAttribute('data-hue', 'transport')
    await expect(padGrid?.querySelector('[aria-label^="Start / Stop"]')).toHaveAttribute('data-hue', 'transport')
    for (const n of oneTouch?.querySelectorAll('button') ?? []) await expect(n).toHaveAttribute('data-hue', 'a')
    const feet = [...(stripGrid?.querySelectorAll('.foot button') ?? [])].slice(4)
    await expect(feet.length).toBe(5)
    for (const f of feet) await expect(f).toHaveAttribute('data-hue', 'lamp')
  },
}

/**
 * The golden layout at a smaller window, 1280 × 800 (`parameters.screen` sets --screen-width and
 * --screen-height), with `overlay` on: the same tree, every cut scaled with the screen.
 */
export const GoldenSmall: Story = {
  name: 'Golden › 1280 × 800',
  args: { layout: 'golden', overlay: true },
  parameters: { screen: { width: 1280, height: 800 } },
}

/**
 * The golden layout stopped, Sync Start armed: Start / Stop outlined with ▶, Sync Start's ring
 * pulsing at the tempo (no beat comes while stopped), its pad twin armed in the same hue; the
 * reading tier says "Sync Start armed".
 */
export const GoldenSyncStart: Story = {
  name: 'Golden › Sync Start armed',
  args: {
    ...stageStopped,
    layout: 'golden',
    overlay: false,
    sectionRow: { ...stageStopped.sectionRow, syncStart: true },
    display: { ...stageStopped.display, nowPlaying: { ...stageStopped.display.nowPlaying, syncStart: true } },
    pads: {
      ...stageStopped.pads,
      pads: stageStopped.pads.pads.map((pad) =>
        pad.label === 'Sync Start' ? { ...pad, state: 'armed' as const, name: 'Sync Start, armed' } : pad,
      ),
    },
  },
  play: async ({ canvasElement }) => {
    const transport = canvasElement.querySelector('[data-golden-name="transport"] [data-golden-slots="grid"]')
    const keys = [...(transport?.children ?? [])]
    await expect(keys[0]).toHaveAttribute('data-face', 'off')
    await expect(keys[1]).toHaveAttribute('data-face', 'armed')
    await expect(keys[1]).toHaveAttribute('data-pulse', 'free')
  },
}

/**
 * The golden layout fading out: Fade solid, its ◣ wedge 40% drained (`fadeProgress`), the board's
 * Fill Up queued for Main C (plain off, its queue in its name).
 */
export const GoldenFading: Story = {
  name: 'Golden › fading',
  args: {
    layout: 'golden',
    overlay: false,
    sectionRow: { ...stageBoard.sectionRow, fading: true, fadeProgress: 0.4 },
  },
  play: async ({ canvasElement }) => {
    const fade = canvasElement.querySelector('[data-golden-name="transport"] [data-golden-slots="grid"]')?.children[5]
    await expect(fade).toHaveAttribute('data-face', 'on')
    await expect(fade?.querySelector('svg')).toHaveAttribute('data-drain', '0.60')
  },
}

/** All eight knobs assigned, with the longest names the app gives them (panels/stage/model.ts). */
const fullKnobs = [
  { label: 'Dynamics', code: 'DynCtrl', value: '127', fraction: 1 },
  { label: 'Retrig rate', code: 'RtgRate', value: '1/16', fraction: 0.6 },
  { label: 'Retrigger', code: 'RtgOnOff', value: 'Off', fraction: 0 },
  { label: 'Harm level', code: 'HarmVol', value: '100', fraction: 0.79 },
  { label: 'Click level', code: 'MetVol', value: '64', fraction: 0.5 },
  { label: 'Harm/Arp', code: 'HarmArp', value: 'On', fraction: 1 },
  { label: 'Mute B', code: 'StyMuteB', value: 'Off', fraction: 0 },
  { label: 'Tempo', code: 'Tempo', value: '288', fraction: 1 },
]

/** The worst case for the reading tier and the knobs: Ending III at 288 BPM, eight knobs assigned. */
const crowded = {
  layout: 'golden' as const,
  overlay: true,
  knobs: { ...stageBoard.knobs, knobs: fullKnobs },
  display: {
    ...stageBoard.display,
    nowPlaying: { ...stageBoard.display.nowPlaying, playing: 'Ending III', hue: 'ending' as const, next: '', fill: '', bpm: 288 },
  },
}

/** Checks the crowded board in real layout: nothing overflows, no two knob names or dials touch. */
async function crowdedPlay({ canvasElement, args }: { canvasElement: HTMLElement; args: { knobs?: { knobs: { label: string }[] } } }) {
  const overlay = canvasElement.querySelector('[data-golden="overlay"]')
  await waitFor(() => expect(overlay?.getAttribute('data-rows-off')).toBe('0'))
  const row = canvasElement.querySelector('[data-golden-name="knob row"] [data-golden-slots="grid"]')
  await expect(row?.getAttribute('data-weights')).toBe('unison unison unison unison unison unison unison unison')
  // Each name and value one line, its full name in the title (designer pass).
  const labels = (args.knobs?.knobs ?? []).map((k) => k.label)
  const nameLines = [...(row?.querySelectorAll<HTMLElement>('.text.name > span:first-child') ?? [])]
  await expect(nameLines.map((s) => s.textContent?.trim())).toEqual(labels)
  await expect(nameLines.map((s) => s.parentElement?.title)).toEqual(labels)
  const names = nameLines.map((s) => s.getBoundingClientRect())
  if (!names.length || names[0].width === 0) return
  await waitFor(() => expect(overlay?.getAttribute('data-overflow')).toBe('0'))
  // Every name and value within its cell less a fib-8, cut short with an ellipsis where it doesn't
  // fit, so two never touch.
  const cells = [...(row?.children ?? [])].map((c) => c.getBoundingClientRect())
  const values = [...(row?.querySelectorAll('.text.value > span') ?? [])].map((s) => s.getBoundingClientRect())
  for (const [i, c] of cells.entries()) {
    await expect(names[i].width).toBeLessThanOrEqual(c.width - 8 + 0.5)
    await expect(values[i].width).toBeLessThanOrEqual(c.width - 8 + 0.5)
  }
  for (let i = 1; i < names.length; i++) await expect(names[i].left - names[i - 1].right).toBeGreaterThanOrEqual(7.5)
  for (const s of nameLines) await expect(s.scrollHeight).toBeLessThanOrEqual(s.clientHeight + 1)
  // The dials the cell over phi (52 px at 1440), the slot pitch kept.
  const dials = [...(row?.querySelectorAll('.dial button') ?? [])].map((d) => d.getBoundingClientRect())
  for (const [i, d] of dials.entries()) await expect(d.width).toBeCloseTo(cells[i].width / 1.618, 0)
  // The tempo's cell holds what it shows and ends on the frame's right edge: no void beside it.
  const tempo = canvasElement.querySelector('.reading.tempo')?.getBoundingClientRect()
  const minus = canvasElement.querySelector('[aria-label="Tempo down (Function)"]')?.getBoundingClientRect()
  await expect(Math.abs((tempo?.right ?? 0) - (minus?.right ?? 0))).toBeLessThanOrEqual(1)
  // "BPM" at the large role (32px), the numeral's ink, standing on its baseline, a fib-13 after
  // it and a fib-21 before + −.
  const numeral = canvasElement.querySelector('.reading.tempo .bpm') as HTMLElement
  const unit = canvasElement.querySelector('.reading.tempo .unit') as HTMLElement
  const steps = canvasElement.querySelector('.reading.tempo .steps') as HTMLElement
  await expect(getComputedStyle(unit).fontSize).toBe('32px')
  await expect(getComputedStyle(unit).color).toBe(getComputedStyle(numeral).color)
  await expect(Math.abs(unit.getBoundingClientRect().bottom - numeral.getBoundingClientRect().bottom)).toBeLessThan(1)
  await expect(Math.round(unit.getBoundingClientRect().left - numeral.getBoundingClientRect().right)).toBe(13)
  await expect(steps.getBoundingClientRect().left - unit.getBoundingClientRect().right).toBeGreaterThanOrEqual(21)
}

/**
 * The golden layout crowded, at 1440 × 900: all eight knobs assigned with the app's longest names
 * (every cell one width, the dial the cell over phi, each name and value one line, cut short with
 * an ellipsis where it doesn't fit), Ending III playing at 288 BPM. The overlay must find nothing
 * overflowing and no two names touching.
 */
export const GoldenCrowded: Story = {
  name: 'Golden › crowded',
  args: crowded,
  play: crowdedPlay,
}

/** The crowded board at 1280 × 800. */
export const GoldenCrowdedSmall: Story = {
  name: 'Golden › crowded, 1280 × 800',
  args: crowded,
  parameters: { screen: { width: 1280, height: 800 } },
  play: crowdedPlay,
}

/** Eight knob names of about 14 characters: each cut short with an ellipsis, its full name in the title. */
const longKnobs = [
  'Retrigger rate',
  'Harmony volume',
  'Metronome vol.',
  'Arpeggio speed',
  'Style mute B+C',
  'Accomp. volume',
  'Filter cut-off',
  'Reverb send A1',
].map((label, i) => ({ ...fullKnobs[i], label }))

/** The crowded board with eight names of about 14 characters (the designer pass's test). */
export const GoldenCrowdedLong: Story = {
  name: 'Golden › crowded, 14-character names',
  args: { ...crowded, knobs: { ...stageBoard.knobs, knobs: longKnobs } },
  play: crowdedPlay,
}

/**
 * The golden layout, interactive: the Playground's wrapper (StagePlayground) in `layout="golden"`.
 * Transport, tempo, One Touch, the part rows, faders, knobs and pads respond as in the Playground;
 * while running, a story-only ticker moves the beat bar. `overlay` draws the cuts over it. The
 * transport's states: Start / Stop (▶ outlined, ■ solid), Sync Start (armed, pulsing; pad 4 the
 * same switch), Fill ▲ / ▼ while running (queues the next Main up or down: the Fill stays plain
 * off, the queue on the "then" line and in its name), Fade (running: solid, its wedge draining over four bars, then the band stops;
 * stopped: armed, a fade-in for Start).
 */
export const GoldenPlayground: Story = {
  args: { layout: 'golden', overlay: false },
  render: (args) => ({ Component: StagePlayground, props: args }),
}
