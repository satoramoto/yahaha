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
 * Golden primitives), here at 1440 × 900. Every size comes from a cut; turn on `overlay` to see them.
 *
 * - **Screen**: a fib-21 margin, then a stack as wide as the frame: the app bar on top (a
 *   bar-height band: the page tabs, the helpers Metronome ▾, Unison, Panic, ?, then the Launchkey
 *   and audio health), the keys at the foot (a keys-height band, black keys keys-height / φ), a
 *   fib-8 gap each; no section row.
 * - **Frame**: a phi box (about 1214 × 750 here) between the two bands.
 * - **Cut 1**, the frame's minor part off the top: the display row, cells square, square, 1:φ, 1:φ,
 *   square (= φ³): chord (the style line, the chord, its notes), song (the section on the chord's
 *   line, "then …", the tempo), transport (a list: "● Playing", Accomp, Sync Start, Reset, Fill ▲
 *   Fill ▼, Fade), One Touch (1–4 stacked), parts (the four part rows). The beat bar runs over all
 *   five, ¾ of the way down.
 * - **Cut 2**, a square off the band's right: knobs (its minor part, on top) over pads (a 4 × 4
 *   grid). The faders take the rest of the band, the status line at their foot.
 * - **Leaves**: each region sits in a leaf with a fib-13 inset, so its content stays inside the cuts;
 *   its size tokens come from the leaf's box (container query units).
 */
export const Golden: Story = {
  args: { layout: 'golden', overlay: false },
}

/**
 * The golden layout with `overlay` on: a GoldenOverlay draws every cut, each leaf's inset (dashed)
 * and the golden spiral in the phi frame, and draws red whatever breaks a rule (a row whose cells
 * don't add up, a slot whose content overflows). The display row adds up: φ³.
 */
export const GoldenOverlay: Story = {
  name: 'Golden › overlay',
  args: { layout: 'golden', overlay: true },
  play: async ({ canvasElement }) => {
    const overlay = canvasElement.querySelector('[data-golden="overlay"]')
    await expect(overlay).not.toBeNull()
    await waitFor(() => expect(overlay?.getAttribute('data-rows-off')).toBe('0'))
    const row = canvasElement.querySelector('[data-golden-name="display"] [data-golden-slots="row"]')
    await expect(row?.getAttribute('data-golden-adds')).toBe('yes')
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
