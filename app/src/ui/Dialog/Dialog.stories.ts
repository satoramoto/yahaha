import type { Meta, StoryObj } from '@storybook/svelte-vite'
import { createRawSnippet } from 'svelte'
import { expect, fn, userEvent, within } from 'storybook/test'
import Dialog from './Dialog.svelte'

const body = createRawSnippet(() => ({
  render: () =>
    '<div><p>The live rack has changes that are not saved.</p>' +
    '<button type="button" data-tip="prompt.unsaved">Save</button> ' +
    '<button type="button" data-tip="prompt.unsaved">Cancel</button></div>',
}))

/**
 * The modal every prompt is drawn in: a scrim over the window and a centred panel with the title
 * and the caller's body. Esc asks to close it; focus starts on the first control and Tab stays in
 * the panel.
 */
const meta = {
  title: 'Components/Dialog',
  component: Dialog,
  parameters: { layout: 'fullscreen' },
  args: {
    title: 'Unsaved changes',
    width: 480,
    children: body,
    onclose: fn(),
  },
  argTypes: {
    title: { control: 'text' },
    width: { control: { type: 'number', min: 240, max: 960, step: 8 } },
  },
} satisfies Meta<typeof Dialog>

export default meta
type Story = StoryObj<typeof meta>

/** "Unsaved changes" with Save and Cancel: Save has focus, Tab wraps to it from Cancel, Esc asks to close. */
export const Board: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    const dialog = canvas.getByRole('dialog', { name: 'Unsaved changes' })
    await expect(dialog).toHaveAttribute('aria-modal', 'true')
    const save = canvas.getByRole('button', { name: 'Save' })
    const cancel = canvas.getByRole('button', { name: 'Cancel' })
    await expect(save).toHaveFocus()
    await userEvent.tab()
    await expect(cancel).toHaveFocus()
    await userEvent.tab()
    await expect(save).toHaveFocus()
    await userEvent.keyboard('{Escape}')
    await expect(args.onclose).toHaveBeenCalledTimes(1)
  },
}
