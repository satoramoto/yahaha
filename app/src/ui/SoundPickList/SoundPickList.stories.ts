import type { Meta, StoryObj } from '@storybook/svelte-vite'
import { expect, fn, within } from 'storybook/test'
import SoundPickList from './SoundPickList.svelte'
import type { SoundPickRow } from './types'

const row = (id: string, number: number | null, name: string, source: SoundPickRow['source'], favourite: boolean, on = false): SoundPickRow => ({
  id,
  number,
  name,
  source,
  favourite,
  on,
})

/**
 * A keyboard part's quick sound list, opened from its sound on the Stage's sound row (the SoundPick
 * board): "Plays on" the part, a search field, then the groups. The sound playing on the part is
 * the white row; a press on a row asks to play it there. "More in Library →" asks for Library ›
 * Sounds.
 */
const meta = {
  title: 'Components/SoundPickList',
  component: SoundPickList,
  parameters: { layout: 'centered' },
  args: {
    part: 'R1',
    partName: 'Right 1',
    hue: 'r1',
    query: '',
    groups: [
      {
        label: 'Last used',
        rows: [
          row('saved:stage-grand', 1, 'Stage Grand', 'Mine', true, true),
          row('au:rhodes', null, 'Rhodes Soft', 'Factory', false),
          row('saved:silk', 41, 'Silk Strings', 'Mine', false),
        ],
      },
      {
        label: 'Favourites',
        rows: [
          row('saved:stage-grand', 1, 'Stage Grand', 'Mine', true, true),
          row('sf:gu:0:4', null, 'Dyno EP', 'SoundFont', true),
          row('sf:gu:0:17', null, 'Jazz Organ', 'SoundFont', true),
          row('au:pad', null, 'Soft Pad', 'Factory', true),
          row('sf:gu:0:24', null, 'Nylon Guitar', 'SoundFont', true),
        ],
      },
    ],
    rowTip: 'sounds.quick_row',
    searchTip: 'sounds.quick_search',
    moreTip: 'sounds.quick_more',
    closeTip: 'sounds.quick_close',
    tipAction: fn(),
    oninput: fn(),
    onpick: fn(),
    onmore: fn(),
    onclose: fn(),
  },
  argTypes: {
    part: { control: 'text' },
    partName: { control: 'text' },
    hue: { control: 'inline-radio', options: ['r1', 'r2', 'r3', 'l'] },
    query: { control: 'text' },
  },
} satisfies Meta<typeof SoundPickList>

export default meta
type Story = StoryObj<typeof meta>

/** Right 1 plays Stage Grand: its rows are chosen. A press on Dyno EP asks to play it. */
export const Board: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole('dialog', { name: 'Quick sounds for Right 1' })).toBeInTheDocument()
    canvas.getByRole('option', { name: /^Dyno EP/ }).click()
    await expect(args.onpick).toHaveBeenCalledWith('sf:gu:0:4')
  },
}

/** Nothing to list yet. */
export const Empty: Story = {
  args: { groups: [], empty: 'No sounds yet: no SoundFonts, plugins or saved sounds.' },
}
