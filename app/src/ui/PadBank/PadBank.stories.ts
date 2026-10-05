import type { Meta, StoryObj } from '@storybook/svelte-vite'
import { expect, fn, within } from 'storybook/test'
import PadBank from './PadBank.svelte'
import { sectionBank, sectionLegend, sectionPads } from './PadBank.fixtures'

/**
 * The band's Pads section: the bank's name, legend and counter, the bank ▲ ▼ buttons, and
 * sixteen Pads, each outlined in its family hue. `lit` is the flash phase of queued and armed pads.
 */
const meta = {
  title: 'Components/PadBank',
  component: PadBank,
  parameters: { layout: 'centered' },
  args: {
    pads: sectionPads,
    bankName: sectionBank.name,
    count: sectionBank.count,
    legend: sectionLegend,
    lit: true,
    tipAction: fn(),
    onbankup: fn(),
    onbankdown: fn(),
    onpress: fn(),
  },
  argTypes: {
    pads: { control: 'object' },
    bankName: { control: 'text' },
    count: { control: 'text' },
    legend: { control: 'object' },
    lit: { control: 'boolean' },
  },
} satisfies Meta<typeof PadBank>

export default meta
type Story = StoryObj<typeof meta>

/** The board: the Sections bank, Main B playing, Main C next, Start / Stop running. */
export const Board: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole('heading', { name: 'Pads' })).toBeInTheDocument()
    await expect(canvasElement.querySelectorAll('[data-face]').length).toBeGreaterThanOrEqual(16)
    await expect(canvas.getByText('NEXT')).toBeInTheDocument()
  },
}

/** The flash's off phase: Main C keeps NEXT; its faint fill goes and its ring drops to the 1px outline. */
export const FlashOff: Story = { args: { lit: false } }
