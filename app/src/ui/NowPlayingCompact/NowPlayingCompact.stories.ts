import type { Meta, StoryObj } from '@storybook/svelte-vite'
import { expect, within } from 'storybook/test'
import NowPlayingCompact from './NowPlayingCompact.svelte'
import { compactBoard, compactStopped } from './NowPlayingCompact.fixtures'

/**
 * The Library's compact now-playing block, 320 × 84: the style name, the tempo and the run-state
 * dot, then the chord in the accent, its notes, and the playing section in its hue. Not a control.
 */
const meta = {
  title: 'Components/NowPlayingCompact',
  component: NowPlayingCompact,
  parameters: { layout: 'centered' },
  args: { ...compactBoard },
  argTypes: {
    style: { control: 'text' },
    tempo: { control: { type: 'number', min: 5, max: 500, step: 1 } },
    running: { control: 'boolean', table: { category: 'StatusDot' } },
    chord: { control: 'text' },
    notes: { control: 'text' },
    section: { control: 'text' },
    sectionHue: { control: 'select', options: ['intro', 'main', 'ending', 'brk', 'fill'] },
    width: { control: { type: 'number', min: 200, max: 480, step: 1 } },
  },
} satisfies Meta<typeof NowPlayingCompact>

export default meta
type Story = StoryObj<typeof meta>

/** The board: Sunday Drive Pop, 104 BPM, running, Am7 (A C E G), Main B. */
export const Board: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const block = canvas.getByRole('group', { name: 'Now playing' })
    await expect(block).toHaveTextContent('Sunday Drive Pop')
    await expect(block).toHaveTextContent('104 BPM')
    await expect(canvas.getByRole('img', { name: 'Running' })).toBeInTheDocument()
    await expect(block).toHaveTextContent('Am7')
    await expect(block).toHaveTextContent('Main B')
  },
}

/** Stopped, no chord: a hollow dot named "Stopped" and a dash for the chord. */
export const Stopped: Story = {
  args: { ...compactStopped },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole('img', { name: 'Stopped' })).toBeInTheDocument()
    await expect(canvas.getByRole('group', { name: 'Now playing' })).toHaveTextContent('—')
  },
}
