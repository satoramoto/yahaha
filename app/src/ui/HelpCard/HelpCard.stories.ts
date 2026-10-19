import type { Meta, StoryObj } from '@storybook/svelte-vite'
import { fn } from 'storybook/test'
import HelpCard from './HelpCard.svelte'

/**
 * Help mode's tip card in the Stage display's right column (Stage-Help): the hovered or pinned
 * control's entry (title, body, Launchkey / Key / Genos rows) and the Pop-up tips lamp.
 */
const meta = {
  title: 'Components/HelpCard',
  component: HelpCard,
  parameters: { layout: 'centered' },
  args: { onfloatingtips: fn(), tipAction: fn(), floatingTips: false },
  argTypes: { floatingTips: { control: 'boolean' } },
} satisfies Meta<typeof HelpCard>

export default meta
type Story = StoryObj<typeof meta>

/** The board: Fade In/Out pinned, Pop-up tips off. */
export const Board: Story = {
  args: {
    entry: {
      title: 'Fade In/Out',
      body: 'Stopped, it arms a fade in: the next start comes up from silence. Playing, the band fades out and stops, and stays silent for the hold time before its volume comes back (only the style fades, not what you play). The fade times are in Settings › Style.',
      group: 'Transport',
      launchkey: ['Shift + Stop button'],
      keys: ['F'],
      genos: 'Fade In/Out (Assignable)',
    },
  },
}

/** Help mode before any control is hovered. */
export const Idle: Story = { args: { entry: null } }
