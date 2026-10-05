import type { Meta, StoryObj } from '@storybook/svelte-vite'
import TempoReadout from './TempoReadout.svelte'

/** The display's tempo: the number a large hero value, the unit in text on its baseline. */
const meta = {
  title: 'Primitives/TempoReadout',
  component: TempoReadout,
  parameters: { layout: 'centered' },
  argTypes: {
    bpm: { control: { type: 'number', min: 5, max: 500, step: 1 } },
    unit: { control: 'text' },
  },
} satisfies Meta<typeof TempoReadout>

export default meta
type Story = StoryObj<typeof meta>

/** The board: 104 BPM. */
export const Board: Story = {
  args: { bpm: 104, unit: 'BPM' },
}
