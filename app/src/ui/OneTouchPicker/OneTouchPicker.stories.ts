import type { Meta, StoryObj } from '@storybook/svelte-vite'
import { expect, fn, within } from 'storybook/test'
import OneTouchPicker from './OneTouchPicker.svelte'

/**
 * One Touch on the display: "One Touch" in `--caption-ink`, then 1-4 as plain text (no boxes) in
 * `--tab-rest`, brightening on hover; the applied one in `--t`, underlined. Numbers past the
 * style's count are disabled.
 */
const meta = {
  title: 'Primitives/OneTouchPicker',
  component: OneTouchPicker,
  parameters: { layout: 'centered' },
  args: { tipAction: fn(), onapply: fn() },
  argTypes: {
    applied: { control: { type: 'inline-radio' }, options: [0, 1, 2, 3, 4] },
    count: { control: { type: 'number', min: 0, max: 4, step: 1 } },
    numbers: { control: { type: 'number', min: 1, max: 4, step: 1 } },
    label: { control: 'text' },
    orientation: { control: { type: 'inline-radio' }, options: ['horizontal', 'vertical'] },
    name: { control: 'text' },
  },
} satisfies Meta<typeof OneTouchPicker>

export default meta
type Story = StoryObj<typeof meta>

/** The board: One Touch 2 applied, underlined. */
export const Board: Story = {
  args: { applied: 2 },
  play: async ({ canvasElement }) => {
    const buttons = within(canvasElement).getAllByRole('button')
    await expect(buttons.map((b) => b.getAttribute('data-face'))).toEqual(['off', 'chosen', 'off', 'off'])
    await expect(buttons[1]).toHaveAttribute('aria-pressed', 'true')
  },
}

/** None applied: every number plain. */
export const NoneApplied: Story = { args: { applied: 0 } }

/** Vertical, as in the golden Stage's One Touch block: the words on top, 1-4 stacked under them. */
export const Vertical: Story = {
  args: { applied: 2, orientation: 'vertical' },
  play: async ({ canvasElement }) => {
    const buttons = within(canvasElement).getAllByRole('button')
    await expect(buttons[1]).toHaveAttribute('aria-pressed', 'true')
    await expect(canvasElement.querySelector('.ots')).toHaveClass('vertical')
  },
}

/** A style with two One Touch settings: 3 and 4 disabled. */
export const TwoSettings: Story = {
  args: { applied: 1, count: 2 },
  play: async ({ canvasElement }) => {
    const buttons = within(canvasElement).getAllByRole('button')
    await expect(buttons.map((b) => (b as HTMLButtonElement).disabled)).toEqual([false, false, true, true])
  },
}
