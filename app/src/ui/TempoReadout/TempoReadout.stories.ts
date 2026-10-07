import type { Meta, StoryObj } from '@storybook/svelte-vite'
import { expect, fireEvent, fn, within } from 'storybook/test'
import TempoReadout from './TempoReadout.svelte'

/**
 * The display's tempo block: the number at the section's size (drag it, scroll on it, or use the
 * arrow keys; double-click for the style's tempo), "BPM" small on its baseline, and + over − at its
 * right, as tall as the number.
 */
const meta = {
  title: 'Primitives/TempoReadout',
  component: TempoReadout,
  parameters: { layout: 'centered' },
  args: { tipAction: fn(), ontempo: fn(), onplus: fn(), onminus: fn(), onreset: fn() },
  argTypes: {
    bpm: { control: { type: 'number', min: 5, max: 500, step: 1 } },
    unit: { control: 'text' },
    min: { control: { type: 'number', min: 5, max: 500, step: 1 } },
    max: { control: { type: 'number', min: 5, max: 500, step: 1 } },
  },
} satisfies Meta<typeof TempoReadout>

export default meta
type Story = StoryObj<typeof meta>

/** The board: 104 BPM. Dragging up 8px asks for 106; − held calls with `true`, released with `false`. */
export const Board: Story = {
  args: { bpm: 104, unit: 'BPM', min: 5, max: 500 },
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement)
    const number = c.getByRole('spinbutton')
    await fireEvent.pointerDown(number, { pointerId: 1, button: 0, clientY: 300 })
    await fireEvent.pointerMove(number, { pointerId: 1, clientY: 292 })
    await fireEvent.pointerUp(number, { pointerId: 1 })
    await expect(args.ontempo).toHaveBeenLastCalledWith(106)
    const minus = c.getByRole('button', { name: 'Tempo down (Function)' })
    await fireEvent.pointerDown(minus, { button: 0 })
    await fireEvent.pointerUp(minus)
    await expect(args.onminus).toHaveBeenNthCalledWith(1, true)
    await expect(args.onminus).toHaveBeenNthCalledWith(2, false)
  },
}

/** At the top of its range: ↑ asks for nothing more. */
export const AtMax: Story = {
  args: { bpm: 500, unit: 'BPM', min: 5, max: 500 },
  play: async ({ canvasElement, args }) => {
    await fireEvent.keyDown(within(canvasElement).getByRole('spinbutton'), { key: 'ArrowUp' })
    await expect(args.ontempo).not.toHaveBeenCalled()
  },
}
