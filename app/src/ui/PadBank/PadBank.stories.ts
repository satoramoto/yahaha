import type { Meta, StoryObj } from '@storybook/svelte-vite'
import { expect, fn, userEvent, within } from 'storybook/test'
import PadBank from './PadBank.svelte'
import { chordPads, multiPads, padBanks, racksPads, sectionLegend, sectionPads, setupPads } from './PadBank.fixtures'

/**
 * The band's Pads section: the pad bank tabs after the title, the bank's hue legend at the header's
 * right end, and sixteen Pads across the whole column, each outlined in its family hue. `lit` is the
 * flash phase of queued and armed pads; a tab choice is a callback with the bank's index.
 */
const meta = {
  title: 'Components/PadBank',
  component: PadBank,
  parameters: { layout: 'centered' },
  args: {
    pads: sectionPads,
    banks: padBanks,
    bank: 0,
    legend: sectionLegend,
    lit: true,
    tipAction: fn(),
    onbank: fn(),
    onpress: fn(),
    // Deprecated, never called (the tabs replaced ▲ ▼); kept as actions for the story test.
    onbankup: fn(),
    onbankdown: fn(),
  },
  argTypes: {
    pads: { control: 'object' },
    banks: { control: 'object' },
    bank: { control: { type: 'number', min: 0, max: padBanks.length - 1, step: 1 } },
    legend: { control: 'object' },
    lit: { control: 'boolean' },
    columns: { control: { type: 'inline-radio' }, options: [8, 4] },
  },
} satisfies Meta<typeof PadBank>

export default meta
type Story = StoryObj<typeof meta>

/** The board: the Sections bank, Main B playing, Main C next, Start / Stop running. A tab click asks for that bank. */
export const Board: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole('heading', { name: 'Pads' })).toBeInTheDocument()
    await expect(canvasElement.querySelectorAll('[data-face]').length).toBeGreaterThanOrEqual(16)
    await expect(canvas.getByText('NEXT')).toBeInTheDocument()
    await expect(canvas.getByRole('tab', { name: 'Sections' })).toHaveAttribute('aria-selected', 'true')
    await userEvent.click(canvas.getByRole('tab', { name: 'Chord' }))
    await expect(args.onbank).toHaveBeenCalledWith(2)
  },
}

/**
 * A 4 × 4 grid (`columns` 4), as in the golden Stage's pads block: pads 1–4, 5–8, 9–12 and 13–16
 * row by row. Here the pads keep the default square `--pad-size`; the golden Stage sets
 * `--pad-width` and `--pad-height` (about 105 × 49) and the bank's width for its block
 * (Screens/Stage › Golden).
 */
export const FourByFour: Story = {
  args: { columns: 4, legend: [] },
  play: async ({ canvasElement }) => {
    const grid = canvasElement.querySelector<HTMLElement>('.pads')
    await expect(grid?.style.getPropertyValue('--pad-columns')).toBe('4')
  },
}

/** The flash's off phase: Main C keeps NEXT; its faint fill goes and its ring drops to the 1px outline. */
export const FlashOff: Story = { args: { lit: false } }

/** Pad page 2, Racks (PadsPage2), Sound latched: the loaded rack is the white block with "Save over", stored racks plain, empty ones hollow. */
export const Racks: Story = { args: { pads: racksPads, bank: 1, legend: [] } }

/** Pad page 3, Chord (PadsChord): Kbd Tr + and Tr Reset lime, Manual Bass dim (Lower detection). */
export const Chord: Story = { args: { pads: chordPads, bank: 2, legend: [] } }

/** Pad page 4, Multi Pads (PadsMultiPads): NEXT / ARMED tags, Select 3 lime, Stop 1–2 lit, Stop 3–4 dim. */
export const MultiPads: Story = { args: { pads: multiPads, bank: 3, legend: [] } }

/** Pad page 5, Setup (PadsSetup): Fingered and ACMP Style the white chosen blocks. */
export const Setup: Story = { args: { pads: setupPads, bank: 4, legend: [] } }
