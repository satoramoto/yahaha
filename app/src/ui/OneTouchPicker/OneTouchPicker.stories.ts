import type { Meta, StoryObj } from '@storybook/svelte-vite'
import { expect, fn, within } from 'storybook/test'
import OneTouchPicker from './OneTouchPicker.svelte'

/**
 * One Touch on the style line: "One Touch OTS" as a caption in `--caption-ink`, the same 13px
 * `--type-text` as the numbers, then 1-4 in the one tab style (ChosenTabs' tokens, no outlines):
 * unchosen numbers in `--tab-rest`, the applied one on a `--neutral` block `--tab-block` tall in
 * `--on-ink`, centred on the 32px line.
 */
const meta = {
  title: 'Primitives/OneTouchPicker',
  component: OneTouchPicker,
  parameters: { layout: 'centered' },
  args: { tipAction: fn(), onapply: fn() },
  argTypes: {
    applied: { control: { type: 'inline-radio' }, options: [0, 1, 2, 3, 4] },
    count: { control: { type: 'number', min: 1, max: 4, step: 1 } },
    label: { control: 'text' },
    code: { control: 'text' },
    name: { control: 'text' },
  },
} satisfies Meta<typeof OneTouchPicker>

export default meta
type Story = StoryObj<typeof meta>

/** The board: One Touch 2 applied, on its chosen block. */
export const Board: Story = {
  args: { applied: 2 },
  play: async ({ canvasElement }) => {
    const buttons = within(canvasElement).getAllByRole('button')
    await expect(buttons.map((b) => b.getAttribute('data-face'))).toEqual(['off', 'chosen', 'off', 'off'])
    await expect(buttons[1]).toHaveAttribute('aria-pressed', 'true')
  },
}

/** None applied: every number a plain `--tab-rest` label, no block. */
export const NoneApplied: Story = { args: { applied: 0 } }
