import type { Meta, StoryObj } from '@storybook/svelte-vite'
import { fn } from 'storybook/test'
import SwapPanel from './SwapPanel.svelte'

/**
 * The swap layer's panel in the Stage display's right column (PadsPage2, state B): the held
 * part, knobs 1-8 as they read (knob 1 the sound, mid-dial) and the Launchkey's live line.
 */
const meta = {
  title: 'Components/SwapPanel',
  component: SwapPanel,
  parameters: { layout: 'centered' },
  args: { onrelease: fn(), tipAction: fn() },
} satisfies Meta<typeof SwapPanel>

export default meta
type Story = StoryObj<typeof meta>

/** The board: Right 1 held, knob 1 turned to 23 Rhodes Soft. */
export const Board: Story = {
  args: {
    data: {
      part: 0,
      label: 'R1',
      name: 'Right 1',
      hue: 'r1',
      sound: '23 Rhodes Soft',
      knobs: [
        ['Sound', '23 Rhodes Soft'],
        ['Level', '90'],
        ['Pan', 'C'],
        ['Reverb', '40'],
        ['Chorus', '12'],
        ['Delay', '0'],
        ['Insert 1', '35%'],
        ['Send 4', '0'],
      ].map(([name, value], i) => ({ k: `K${i + 1}`, name, value })),
    },
  },
}
