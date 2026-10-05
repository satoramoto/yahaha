import type { Meta, StoryObj } from '@storybook/svelte-vite'
import { expect, fn, within } from 'storybook/test'
import Pad from './Pad.svelte'

/**
 * One band pad in the state language: caption bottom left and index top right in its hue, inside a
 * 1px outline of it. Faces: idle (the outline), dark (absent), playing and running (solid fill,
 * `--on-ink` words), next and armed (2px ring, faint fill, NEXT or ARMED). `lit` is the flash phase
 * of next and armed.
 */
const meta = {
  title: 'Primitives/Pad',
  component: Pad,
  parameters: { layout: 'centered' },
  args: {
    label: 'Main B',
    index: '10',
    family: 'main',
    state: 'playing',
    lit: true,
    tip: 'section.lamps',
    onpress: fn(),
    tipAction: fn(),
  },
  argTypes: {
    label: { control: 'text' },
    index: { control: 'text' },
    family: { control: 'select', options: ['intro', 'main', 'ending', 'brk', 'fill', 'util', 'start'] },
    state: { control: 'select', options: ['idle', 'dark', 'playing', 'next', 'armed', 'running'] },
    lit: { control: 'boolean' },
    name: { control: 'text' },
    tip: { control: 'text' },
  },
} satisfies Meta<typeof Pad>

export default meta
type Story = StoryObj<typeof meta>

/** Main B on the board, playing: a solid fill of the Main hue, the words in `--on-ink`. */
export const Board: Story = { args: { name: 'Main B, playing' } }

/** An idle section pad: Intro I in its hue, inside a 1px outline of it, on no fill. */
export const Idle: Story = { args: { label: 'Intro I', index: '1', family: 'intro', state: 'idle' } }

/** A pad the style lacks: Intro III, outline and words in `--absent`. */
export const Dark: Story = {
  args: { label: 'Intro III', index: '3', family: 'intro', state: 'dark', name: 'Intro III (not in this style)' },
  play: async ({ canvasElement }) => {
    const pad = within(canvasElement).getByRole('button', { name: 'Intro III (not in this style)' })
    await expect(pad).toHaveAttribute('data-hue', 'absent')
    await expect(pad).toHaveAttribute('data-contrast', 'dim')
  },
}

/** Queued: Main C, a 2px ring and a faint fill of the hue, NEXT in place of the index. */
export const Next: Story = {
  args: { label: 'Main C', index: '11', state: 'next', name: 'Main C, queued after bar 4 (flashing)' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText('NEXT')).toBeInTheDocument()
    await expect(canvas.queryByText('11')).toBeNull()
  },
}

/** Queued, the flash's off phase: the fill gone, the 1px outline; the words stay. */
export const NextUnlit: Story = {
  args: { label: 'Main C', index: '11', state: 'next', lit: false, name: 'Main C, queued after bar 4 (flashing)' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('NEXT')).toBeInTheDocument()
  },
}

/** Armed: Ending I, the 2px ring and faint fill with a glow, ARMED. */
export const Armed: Story = {
  args: { label: 'Ending I', index: '5', family: 'ending', state: 'armed', name: 'Ending I, armed (pulsing)' },
}

/** A utility pad: Sync Start, neutral outline and words. */
export const Utility: Story = {
  args: { label: 'Sync Start', index: '4', family: 'util', state: 'idle' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('button')).toHaveAttribute('data-hue', 'neutral')
  },
}

/** A lit utility pad: Auto Fill on, a solid neutral fill with `--on-ink` words. */
export const UtilityOn: Story = { args: { label: 'Auto Fill', index: '12', family: 'util', state: 'playing' } }

/** Start / Stop running: a solid `--ok` fill. */
export const Running: Story = {
  args: { label: 'Start / Stop', index: '16', family: 'start', state: 'running', name: 'Start / Stop, running (pad 16)' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('button')).toHaveAttribute('data-hue', 'ok')
  },
}
