import type { Meta, StoryObj } from '@storybook/svelte-vite'
import { fn } from 'storybook/test'
import Stage from './Stage.svelte'
import { stageBoard, stageStopped } from './Stage.fixtures'
import StagePlayground from './StagePlayground.svelte'

/** Groups a callback's control under its component. */
const on = (category: string, names: string[]) =>
  Object.fromEntries(names.map((name) => [name, { table: { category } }]))

const CALLBACKS: Record<string, string[]> = {
  AppBar: ['onchoose', 'onhealth'],
  SectionRow: ['onaccomp', 'onmetronome', 'onmetronomesettings', 'onunison', 'onpanic', 'onhelp'],
  Display: ['onprev', 'onnext', 'onbrowse', 'ononetouch', 'onsends', 'onrack', 'onpart', 'onsound'],
  FaderBank: [
    'onchoosePage',
    'onchooseLayer',
    'onlevel',
    'onopen',
    'onlamp',
    'onlamplong',
    'onlamprelease',
    'onpagebutton',
  ],
  KnobBank: ['onpageup', 'onpagedown', 'onknobpress', 'onstep'],
  PadBank: ['onbankup', 'onbankdown', 'onpadpress'],
  TransportColumn: [
    'onstartstop',
    'onstop',
    'onstoplong',
    'onreset',
    'onfade',
    'onfillup',
    'onfilldown',
    'ontempoup',
    'ontempodown',
    'onstyletempo',
  ],
  StatusLine: ['onclear'],
}

const actions = Object.fromEntries(Object.values(CALLBACKS).flatMap((names) => names.map((name) => [name, fn()])))

/**
 * The Stage page at the app's 1440 × 900: the app bar, the section row, the display, the hardware
 * band (faders; knobs above pads; transport), the status line and the keys. Each region's data is
 * one object control; every callback is an action, grouped under its component.
 */
const meta = {
  title: 'Screens/Stage',
  component: Stage,
  parameters: { layout: 'fullscreen' },
  args: { ...stageBoard, tipAction: fn(), ...actions },
  argTypes: {
    appBar: { control: 'object', table: { category: 'AppBar' } },
    sectionRow: { control: 'object', table: { category: 'SectionRow' } },
    display: { control: 'object', table: { category: 'Display' } },
    faders: { control: 'object', table: { category: 'FaderBank' } },
    knobs: { control: 'object', table: { category: 'KnobBank' } },
    pads: { control: 'object', table: { category: 'PadBank' } },
    transport: { control: 'object', table: { category: 'TransportColumn' } },
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
 * - Faders drag, knobs turn (the Tempo knob is the tempo), lamps toggle: Accomp, Metronome (and its
 *   ▾), Unison, ?, the part lamps (an Off part dims its strip and sound) and the function lamps.
 * - Pads, no timers: stopped, a Main or Break plays at once, an Intro or Ending arms. Running, a
 *   section pad is queued (NEXT); press it again and it lands; a landed Ending stops the band. Start
 *   plays the armed pad and queues the Main that was playing; Stop clears what was queued or armed.
 *   Sync Start, Auto Fill and Sync Stop toggle.
 * - Start / Stop (pad 16 or the transport) and Stop swap the display between the board and the
 *   stopped display; Fade toggles; Tempo + and − step the tempo, Style tempo goes back to 104.
 * - One Touch applies, ◀ ▶ step through a few styles, Panic writes a status line, a click clears it,
 *   and the knob page and pad bank ▲ ▼ step their counters.
 */
export const Playground: Story = {
  render: (args) => ({ Component: StagePlayground, props: args }),
}
