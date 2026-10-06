import type { Meta, StoryObj } from '@storybook/svelte-vite'
import { expect, within } from 'storybook/test'
import NowPlayingCompact from './NowPlayingCompact.svelte'

/**
 * The now-playing block at the head of a full page's left column (Settings): the style, its tempo
 * and the running light (StatusDot, green when running, hollow when stopped); then the chord with
 * its extension, its notes and the playing section in its hue. Beat, bar and next live in the
 * section row's count, not here.
 */
const meta = {
  title: 'Components/NowPlayingCompact',
  component: NowPlayingCompact,
  parameters: { layout: 'centered' },
  args: {
    style: 'Sunday Drive Pop',
    bpm: 104,
    running: true,
    chord: 'Am',
    ext: '7',
    notes: 'A C E G',
    section: 'Main B',
    hue: 'main',
  },
  argTypes: {
    style: { control: 'text' },
    bpm: { control: 'number' },
    running: { control: 'boolean' },
    chord: { control: 'text' },
    ext: { control: 'text' },
    notes: { control: 'text' },
    section: { control: 'text' },
    hue: { control: 'select', options: ['intro', 'main', 'ending', 'brk', 'fill'] },
  },
} satisfies Meta<typeof NowPlayingCompact>

export default meta
type Story = StoryObj<typeof meta>

/** The Settings boards: Sunday Drive Pop at 104 BPM, running; Am7, "A C E G", Main B. */
export const Board: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const block = canvas.getByRole('group', { name: 'Now playing' })
    await expect(block).toHaveTextContent('Sunday Drive Pop')
    await expect(block).toHaveTextContent('104BPM')
    await expect(block).toHaveTextContent('Am7')
    await expect(block).toHaveTextContent('A C E G')
    await expect(block).toHaveTextContent('Main B')
    await expect(canvas.getByRole('img', { name: 'Running' })).toBeInTheDocument()
    await expect(canvas.queryByRole('img', { name: 'Stopped' })).toBeNull()
  },
}

/** Stopped: the light is a hollow dot named "Stopped"; a fractional tempo shows rounded. */
export const Stopped: Story = {
  args: { running: false, bpm: 96.4, section: 'Intro A', hue: 'intro', chord: 'C', ext: '', notes: 'C E G' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole('img', { name: 'Stopped' })).toBeInTheDocument()
    await expect(canvas.queryByRole('img', { name: 'Running' })).toBeNull()
    await expect(canvasElement).toHaveTextContent('96BPM')
    await expect(canvasElement).toHaveTextContent('Intro A')
  },
}

/** No chord held: a dash in the chord's place, and no notes. */
export const NoChord: Story = {
  args: { chord: '', ext: '', notes: '' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText('—')).toBeInTheDocument()
    await expect(canvasElement).not.toHaveTextContent('A C E G')
  },
}
