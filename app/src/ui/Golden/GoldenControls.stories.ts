import type { Meta, StoryObj } from '@storybook/svelte-vite'
import { createRawSnippet, type ComponentProps } from 'svelte'
import { expect, fn } from 'storybook/test'
import FaderCell from './FaderCell.svelte'
import KnobCell from './KnobCell.svelte'

/**
 * The band's controls as Golden trees, each at the size the Stage gives one cell. A knob: a box in
 * the knob's shape, a square off its top for the dial, then the name in a label-height band at the
 * foot and the value above it. A fader: a box in the fader's shape cut in steps, the track, the
 * value and the strip's name; as a whole Stage strip it also takes the part's sound in a band off
 * its top and its lamp in a band off its foot. The overlay draws the cuts and reports what doesn't
 * fit; the Tuning toolbar switches the shapes.
 */
const meta = {
  title: 'Golden/Controls',
  component: KnobCell,
  parameters: { layout: 'centered' },
  args: {
    tipAction: fn(),
    onpress: fn(),
    onstep: fn(),
  },
} satisfies Meta<typeof KnobCell>

export default meta
type Story = StoryObj<typeof meta>

/** One knob cell, its cuts drawn: "Retrig rate" is wider than the cell, so its name ends in an ellipsis. */
export const Knob: Story = {
  args: {
    label: 'Retrig rate',
    code: 'RtgRate',
    value: '1/8',
    unit: '',
    fraction: 0.4,
    unused: false,
    tip: 'knob.style.retrigRate',
    overlay: true,
  },
  argTypes: {
    label: { control: 'text' },
    code: { control: 'text' },
    value: { control: 'text' },
    unit: { control: 'text' },
    fraction: { control: { type: 'range', min: 0, max: 1, step: 0.01 } },
    unused: { control: 'boolean' },
    tip: { control: 'text' },
    overlay: { control: 'boolean' },
  },
  play: async ({ canvasElement }) => {
    const box = canvasElement.querySelector('[data-golden="box"]')
    await expect(box?.querySelector('[data-golden-fit][data-shape="knob"]')).not.toBeNull()
    const split = box?.querySelector('[data-golden-slots="cut"][data-take="square"]')
    await expect(split).not.toBeNull()
    const band = split?.querySelector('[data-golden-slots="cut"][data-band="label-height"]')
    await expect(band?.children.length).toBe(2)
    await expect(canvasElement.querySelector('[data-golden="overlay"]')).not.toBeNull()
  },
}

/** One fader cell, its cuts drawn: the track, the value (square in the Phi tuning) and the strip's name. */
export const Fader: StoryObj<typeof FaderCell> = {
  // The meta's knob actions (onpress, onstep) aren't the fader's.
  render: (args) => {
    const { onpress: _press, onstep: _step, ...props } = args as Record<string, unknown>
    return { Component: FaderCell, props: props as ComponentProps<typeof FaderCell> }
  },
  args: {
    name: 'Right 1 · Stage Grand, level 90',
    label: 'R1 Piano',
    value: '90',
    level: 90,
    meter: 0.62,
    meter2: 0.58,
    peak: 0.7,
    kind: 'part',
    hue: 'r1',
    layered: false,
    tip: 'mixer.panel.right1',
    overlay: true,
    onlevel: fn(),
  },
  argTypes: {
    name: { control: 'text' },
    label: { control: 'text' },
    value: { control: 'text' },
    level: { control: { type: 'range', min: 0, max: 127, step: 1 } },
    meter: { control: { type: 'range', min: 0, max: 1, step: 0.01 } },
    meter2: { control: { type: 'range', min: 0, max: 1, step: 0.01 } },
    peak: { control: { type: 'range', min: 0, max: 1, step: 0.01 } },
    kind: { control: 'select', options: ['part', 'group', 'master', 'off', 'parked'] },
    hue: { control: 'select', options: ['r1', 'r2', 'r3', 'l', 'a', 't2', 't'] },
    layered: { control: 'boolean' },
    tip: { control: 'text' },
    overlay: { control: 'boolean' },
  },
  play: async ({ canvasElement }) => {
    const box = canvasElement.querySelector('[data-golden="box"]')
    await expect(box?.querySelector('[data-golden-fit][data-shape="fader"]')).not.toBeNull()
    const steps = box?.querySelector('[data-golden-slots="steps"]')
    await expect(steps?.children.length).toBe(3)
    await expect(canvasElement.querySelector('[data-golden="overlay"]')).not.toBeNull()
  },
}

/**
 * A whole Stage strip, as the golden Stage draws it (Option C): the part's sound in a tab-block
 * band off the top (it opens the part's sound list), the track, the value and the name button
 * (it opens Channel) in steps, and the strip's lamp in a control-height band off the foot.
 */
export const Strip: StoryObj<typeof FaderCell> = {
  // The lamp is content (a snippet), not an arg: a plain lamp button stands in for the LampButton.
  render: (args) => {
    const { onpress: _press, onstep: _step, ...props } = args as Record<string, unknown>
    const lamp = createRawSnippet(() => ({ render: () => '<button type="button" aria-pressed="true">On</button>' }))
    return { Component: FaderCell, props: { ...props, lamp } as ComponentProps<typeof FaderCell> }
  },
  args: {
    ...Fader.args,
    label: 'Right 1',
    sound: 'Stage Grand',
    soundName: 'Right 1 sound: Stage Grand. Opens the quick sound list',
    soundTip: 'launchkey.fader_sound',
    openName: 'Right 1, Stage Grand: open Channel',
    openTip: 'mixer.strip.select',
    edited: true,
    onsound: fn(),
    onopen: fn(),
  },
  argTypes: {
    ...Fader.argTypes,
    sound: { control: 'text' },
    soundName: { control: 'text' },
    soundTip: { control: 'text' },
    openName: { control: 'text' },
    openTip: { control: 'text' },
    edited: { control: 'boolean' },
  },
  play: async ({ args, canvasElement }) => {
    const box = canvasElement.querySelector('[data-golden="box"]')
    await expect(box?.querySelector('[data-golden-slots="cut"][data-band="tab-block"]')).not.toBeNull()
    await expect(box?.querySelector('[data-golden-slots="cut"][data-band="control-height"]')).not.toBeNull()
    const sound = canvasElement.querySelector<HTMLButtonElement>('button[aria-label^="Right 1 sound"]')
    sound?.click()
    await expect(args.onsound).toHaveBeenCalled()
    canvasElement.querySelector<HTMLButtonElement>('button[aria-label="Right 1, Stage Grand: open Channel"]')?.click()
    await expect(args.onopen).toHaveBeenCalled()
  },
}
