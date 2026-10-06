import type { Meta, StoryObj } from '@storybook/svelte-vite'
import { fn } from 'storybook/test'
import StyleLine from './StyleLine.svelte'
import { styleLineBoard, styleLineLong, styleLineQueued } from './StyleLine.fixtures'

/**
 * The small line at the top of the display's left third: ‹ the style's name in the accent ›, then
 * its category and time signature (or a queued style after "→"). Plain text controls, no boxes.
 * A third of the display wide.
 */
const meta = {
  title: 'Components/StyleLine',
  component: StyleLine,
  parameters: { layout: 'centered' },
  args: {
    ...styleLineBoard,
    tipAction: fn(),
    onprev: fn(),
    onnext: fn(),
    onbrowse: fn(),
  },
  argTypes: {
    styleName: { control: 'text' },
    category: { control: 'text' },
    timeSignature: { control: 'text' },
    queued: { control: 'text' },
  },
} satisfies Meta<typeof StyleLine>

export default meta
type Story = StoryObj<typeof meta>

/** The board: ‹ Sunday Drive Pop ›  Pop & Rock · 4/4. */
export const Board: Story = {}

/** Coastal Highway waits for the bar line: "→ Coastal Highway" in place of the category. */
export const Queued: Story = { args: { ...styleLineQueued } }

/** A name longer than the third: it ends in an ellipsis, the full name in its title. */
export const LongName: Story = { args: { ...styleLineLong } }
