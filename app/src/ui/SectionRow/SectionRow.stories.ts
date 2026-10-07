import type { Meta, StoryObj } from '@storybook/svelte-vite'
import { fn } from 'storybook/test'
import SectionRow from './SectionRow.svelte'
import { sectionRowBoard } from './SectionRow.fixtures'

/**
 * The toolbar under the app bar: the transport at the left (Start / Stop, Accomp, Sync Start,
 * Reset, Fill ▲, Fill ▼, Fade), then Metronome with its settings caret, Unison, Panic and help
 * mode's ? at the right. 1392 wide, the screen inside its padding.
 */
const meta = {
  title: 'Components/SectionRow',
  component: SectionRow,
  parameters: { layout: 'centered' },
  args: {
    ...sectionRowBoard,
    tipAction: fn(),
    onstartstop: fn(),
    onaccomp: fn(),
    onsyncstart: fn(),
    onreset: fn(),
    onfillup: fn(),
    onfilldown: fn(),
    onfade: fn(),
    onmetronome: fn(),
    onmetronomesettings: fn(),
    onunison: fn(),
    onpanic: fn(),
    onhelp: fn(),
  },
  argTypes: {
    running: { control: 'boolean', table: { category: 'LampButton' } },
    accomp: { control: 'boolean', table: { category: 'LampButton' } },
    syncStart: { control: 'boolean', table: { category: 'LampButton' } },
    metronome: { control: 'boolean', table: { category: 'LampButton' } },
    unison: { control: 'boolean', table: { category: 'LampButton' } },
    fading: { control: 'boolean', table: { category: 'Button' } },
    metronomeOpen: { control: 'boolean', table: { category: 'Button' } },
    metronomeControls: { control: 'text', table: { category: 'Button' } },
    help: { control: 'boolean', table: { category: 'Button' } },
  },
} satisfies Meta<typeof SectionRow>

export default meta
type Story = StoryObj<typeof meta>

/** The dark board: stopped, Accomp lit, every other switch and helper off. */
export const Board: Story = {}

/**
 * Running: each switch is a dot and a word, the dot filled in its hue when on and a hollow ring
 * when off; actions are plain words; Start / Stop reads "● Playing" in the running hue.
 */
export const Running: Story = {
  args: { running: true },
}

/** Stopped, with Sync Start, Fade, Metronome (settings open), Unison and help on. */
export const AllOn: Story = {
  args: {
    running: false,
    syncStart: true,
    fading: true,
    metronome: true,
    metronomeOpen: true,
    unison: true,
    help: true,
  },
}
