import type { Meta, StoryObj } from '@storybook/svelte-vite'
import ChordReadout from './ChordReadout.svelte'

const AM7 = [
  { note: 'A', interval: 'R' },
  { note: 'C', interval: 'm3' },
  { note: 'E', interval: '5' },
  { note: 'G', interval: 'm7' },
]

/**
 * The display's chord: the "Chord" label, the 128px light chord in the accent with its extension,
 * the notes with their intervals, and the fingering word. Held dims it to muted grey.
 */
const meta = {
  title: 'Primitives/ChordReadout',
  component: ChordReadout,
  parameters: { layout: 'centered' },
  argTypes: {
    chord: { control: 'text' },
    extension: { control: 'text' },
    notes: { control: 'object' },
    fingering: { control: 'text' },
    held: { control: 'boolean' },
    label: { control: 'text' },
  },
} satisfies Meta<typeof ChordReadout>

export default meta
type Story = StoryObj<typeof meta>

/** The board: Am7, A C E G over R m3 5 m7, Fingered. */
export const Board: Story = {
  args: { chord: 'Am', extension: '7', notes: AM7, fingering: 'Fingered', held: false, label: 'Chord' },
}

/** Held: detection is unsure, so the last chord stays, muted, with "held" beside it. */
export const Held: Story = {
  args: { chord: 'Am', extension: '7', notes: AM7, fingering: 'Fingered', held: true },
}

/** A five-character chord (Cmaj7) drops to 80px so it and "held" fit the column. */
export const MidLength: Story = {
  args: {
    chord: 'C',
    extension: 'maj7',
    notes: [
      { note: 'C', interval: 'R' },
      { note: 'E', interval: '3' },
      { note: 'G', interval: '5' },
      { note: 'B', interval: '7' },
    ],
    fingering: 'Fingered',
    held: true,
  },
}

/** Six or seven characters (F♯m7♭5) drop to 64px; eight or more to 52px. */
export const Long: Story = {
  args: {
    chord: 'F♯m',
    extension: '7♭5',
    notes: [
      { note: 'F♯', interval: 'R' },
      { note: 'A', interval: 'm3' },
      { note: 'C', interval: '♭5' },
      { note: 'E', interval: 'm7' },
    ],
    fingering: 'AI Full Keyboard',
  },
}

/** No chord yet: a dash, no notes. */
export const Empty: Story = {
  args: { chord: '', notes: [], fingering: 'Fingered' },
}
