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
 *   major part the transport, six outlined cells sized by use and consequence together (Start /
 *   Stop phi² units, its legend the action, the solid fill the state; Accomp and Sync Start 1; the
 *   Fill ▲ ▼ pair 2, so each Fill is 1, side by side; Fade 1; Reset 1 at the far end behind a
 *   quarter-unit gutter, about a fib-21), the rest One Touch (its caption a narrow label cell, then
 *   1–4). The reading tier above (215) reads style → chord → section → next: the style line (‹
 *   name › as 32px squares, then category · metre right after ›) in a control-height band, a fib-8
 *   over the chord, a quarter off its left, then the section and the tempo (halves). Chord, Main B
 *   and the tempo are one size, their capitals filling the row (capped so "Am7" fits its column),
 *   on one shared line, flush left. A fib-8 under it, one small line across: the chord's notes;
 *   what comes next as Main B's subtitle ("then ▬ Main C · fill after bar 4", the bar and "Main C"
 *   in its hue: a display, not a control); the beat bar (fib-13 bars, faded, the current beat the
 *   full hue, the downbeat taller and glowing when current). + and − are one square beside the
 *   tempo, its side the cap height, cut in half across. No parts block: each part's sound is on top of its own fader strip
 *   (Option C), in the part's hue, cut short with an ellipsis at its strip.
 * - **Band** (1398 × 456): its major part the faders (a header band, the status line at its right
 *   end; nine strips, each with its own foot: the part lamps under strips 1–4, then a sub-cut and
 *   the functions and the page button under strips 5–9; a parked strip is full width, so its
 *   button's word fits, drawn as a dotted ghost in the faded hue: absent, not live at zero); the rest
 *   knobs (its minor part, on top: a header band over eight knob cells, an unused knob phi² below
 *   a live one, each dial as big as its cell allows, its value under it, its name on one line
 *   under that: where the name doesn't fit, its first word, never a code) over pads (a header
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
    // The transport is six cells graded by use and consequence: Start / Stop phi² units (its legend
    // the action), the Fill pair 2 (each Fill a unit, as wide as Accomp), Reset last behind a
    // quarter-unit gutter (its cell a major third).
    const transport = canvasElement.querySelector('[data-golden-name="transport"] [data-golden-slots="grid"]')
    await expect(transport?.children.length).toBe(6)
    await expect(transport?.getAttribute('data-weights')).toBe('phi2 unison unison octave unison major-third')
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
    // The knobs: an unused knob phi² below a live one; each value under its dial (not in the ring)
    // and the name on one line under it.
    const knobRow = canvasElement.querySelector('[data-golden-name="knob row"] [data-golden-slots="grid"]')
    await expect(knobRow?.getAttribute('data-weights')).toBe('phi2 phi2 phi2 phi2 phi2 phi2 unison phi2')
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
    // Real layout only (jsdom has none): Tempo + and − each at least 44px on their short side; the
    // next section a fib-8 under Main B, flush with its left edge; each Fill as wide as Accomp;
    // Start / Stop phi of it; Reset a unit, behind a gutter wider than a fib-13.
    const plus = canvasElement.querySelector('[aria-label="Tempo up (Scene Launch)"]')?.getBoundingClientRect()
    if (plus && plus.height > 0) {
      await expect(Math.min(plus.width, plus.height)).toBeGreaterThanOrEqual(44)
      const section = canvasElement.querySelector('.section .stand')?.getBoundingClientRect()
      const line = next?.getBoundingClientRect()
      await expect(Math.round((line?.top ?? 0) - (section?.bottom ?? 0))).toBe(8)
      await expect(Math.round((line?.left ?? 0) - (section?.left ?? 0))).toBe(0)
      const [start, accomp, , fills, fade, reset] = [...(transport?.children ?? [])].map((c) => c.getBoundingClientRect())
      const fill = fills.width / 2
      await expect(fill).toBeGreaterThanOrEqual(accomp.width - 1)
      await expect(start.width / accomp.width).toBeCloseTo(2.618, 1)
      await expect(Math.abs(reset.width - accomp.width)).toBeLessThanOrEqual(1)
      await expect(reset.left - fade.right).toBeGreaterThanOrEqual(20)
      // No dead band over the heroes: they start a fib-8 under the style line.
      const styleBand = reading?.firstElementChild?.getBoundingClientRect()
      await expect(Math.round((section?.top ?? 0) - (styleBand?.bottom ?? 0))).toBe(8)
      // The beat bar reads from across the room: each bar a fib-13 deep.
      await expect(canvasElement.querySelector('.beat:not(.now)')?.getBoundingClientRect().height).toBe(13)
    }
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
 * The golden layout, interactive: the Playground's wrapper (StagePlayground) in `layout="golden"`.
 * Transport, tempo, One Touch, the part rows, faders, knobs and pads respond as in the Playground;
 * while running, a story-only ticker moves the beat bar. `overlay` draws the cuts over it.
 */
export const GoldenPlayground: Story = {
  args: { layout: 'golden', overlay: false },
  render: (args) => ({ Component: StagePlayground, props: args }),
}
