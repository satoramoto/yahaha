import type { Meta, StoryObj } from '@storybook/svelte-vite'
import { expect, fn, userEvent, within } from 'storybook/test'
import PadBank from './PadBank.svelte'
import { padBanks, sectionLegend, sectionPads } from './PadBank.fixtures'

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

/** The flash's off phase: Main C keeps NEXT; its faint fill goes and its ring drops to the 1px outline. */
export const FlashOff: Story = { args: { lit: false } }
