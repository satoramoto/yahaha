import type { Meta, StoryObj } from '@storybook/svelte-vite'
import { createRawSnippet, mount, unmount, type ComponentProps } from 'svelte'
import { expect, fn, within } from 'storybook/test'
import GoldenGrid from '../Golden/GoldenGrid.svelte'
import SectionRow from './SectionRow.svelte'
import { sectionRowBoard } from './SectionRow.fixtures'

/**
 * A GoldenGrid's cells holding a `cells` SectionRow: the toolbar (the role the parent supplies) is
 * a `display: contents` element, so each control is a grid item, one a cell.
 */
function inGrid(args: ComponentProps<typeof SectionRow>) {
  return createRawSnippet(() => ({
    render: () => '<div role="toolbar" aria-label="Transport" style="display: contents"></div>',
    setup: (root: Element) => {
      const row = mount(SectionRow, { target: root, props: args })
      return () => {
        void unmount(row)
      }
    },
  }))
}

/**
 * The toolbar under the app bar: the transport at the left (Start / Stop, Accomp, Sync Start,
 * Reset, Fill ▲, Fill ▼, Fade), then Metronome with its settings caret, Unison, Panic and help
 * mode's ? at the right. 1392 wide, the screen inside its padding.
 */
const meta = {
  title: 'Components/SectionRow',
  component: SectionRow,
  parameters: { layout: 'centered' },
  args: {
    ...sectionRowBoard,
    tipAction: fn(),
    onstartstop: fn(),
    onaccomp: fn(),
    onsyncstart: fn(),
    onreset: fn(),
    onfillup: fn(),
    onfilldown: fn(),
    onfade: fn(),
    onmetronome: fn(),
    onmetronomesettings: fn(),
    onunison: fn(),
    onpanic: fn(),
    onhelp: fn(),
  },
  argTypes: {
    running: { control: 'boolean', table: { category: 'LampButton' } },
    accomp: { control: 'boolean', table: { category: 'LampButton' } },
    syncStart: { control: 'boolean', table: { category: 'LampButton' } },
    metronome: { control: 'boolean', table: { category: 'LampButton' } },
    unison: { control: 'boolean', table: { category: 'LampButton' } },
    fading: { control: 'boolean', table: { category: 'Button' } },
    metronomeOpen: { control: 'boolean', table: { category: 'Button' } },
    metronomeControls: { control: 'text', table: { category: 'Button' } },
    help: { control: 'boolean', table: { category: 'Button' } },
    groups: { control: { type: 'inline-radio' }, options: ['all', 'transport', 'helpers'] },
    orientation: { control: { type: 'inline-radio' }, options: ['horizontal', 'vertical'] },
    cells: { control: 'boolean' },
  },
} satisfies Meta<typeof SectionRow>

export default meta
type Story = StoryObj<typeof meta>

/** The dark board: stopped, Accomp lit, every other switch and helper off. */
export const Board: Story = {}

/**
 * Running: each switch is a dot and a word, the dot filled in its hue when on and a hollow ring
 * when off; actions are plain words; Start / Stop reads "● Playing" in the running hue.
 */
export const Running: Story = {
  args: { running: true },
}

/**
 * The transport alone as a list (`groups` transport, `orientation` vertical), as in the golden
 * Stage's transport block: "● Playing", Accomp, Sync Start, Reset, "Fill ▲  Fill ▼" on one line, Fade.
 */
export const VerticalTransport: Story = {
  args: { running: true, groups: 'transport', orientation: 'vertical' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole('toolbar', { name: 'Transport' })).toHaveAttribute('aria-orientation', 'vertical')
    await expect(canvas.queryByRole('button', { name: 'Panic: all notes off' })).toBeNull()
    await expect(canvas.getAllByRole('button')).toHaveLength(7)
  },
}

/** The helpers alone (`groups` helpers), as in the golden Stage's app bar: Metronome ▾, Unison, Panic, ?. */
export const Helpers: Story = {
  args: { groups: 'helpers', metronome: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole('toolbar', { name: 'Helpers' })).toBeInTheDocument()
    await expect(canvas.queryByRole('group', { name: 'Transport' })).toBeNull()
  },
}

/**
 * The transport in cells (`cells`, `groups` transport) in a 6-cell GoldenGrid, its cuts drawn: no
 * wrapper, each control one key filling its cell, in the transport hue (amber), a glyph band over
 * its word, every word on one baseline: ▶ ■ Start / Stop solid while running (outlined when not),
 * its legend always "Start / Stop", Accomp solid (on) and Sync Start with an empty band, Fill one
 * key split in two (▲ | ▼, one "Fill" under both), ◢ Fade, then ⟲ Reset at the far end, set apart
 * by a fib-13 gap. The grid's toolbar element supplies the role.
 */
export const Cells: Story = {
  args: { running: true, accomp: true, groups: 'transport', cells: true },
  parameters: { sample: { width: 610, height: 55 } },
  render: (args) => ({
    // GoldenGrid hosts the story; Storybook types `Component` and `props` as SectionRow's.
    Component: GoldenGrid as unknown as typeof SectionRow,
    props: { columns: 6, overlay: true, name: 'Transport', children: inGrid(args) } as unknown as typeof args,
  }),
  play: async ({ canvasElement }) => {
    const toolbar = within(canvasElement).getByRole('toolbar', { name: 'Transport' })
    const controls = [...toolbar.children]
    await expect(controls).toHaveLength(6)
    await expect(toolbar.parentElement).toHaveAttribute('data-golden-slots', 'grid')
    // Start / Stop's legend is the action; the solid fill (and the spoken name) is the state.
    await expect(controls[0]).toHaveTextContent('Start / Stop')
    await expect(controls[0]).toHaveAccessibleName(/^Playing: Start \/ Stop/)
    await expect(controls[0]).toHaveAttribute('aria-pressed', 'true')
    await expect(controls[0]).toHaveAttribute('data-face', 'on')
    await expect(controls[1]).toHaveAttribute('data-face', 'on')
    await expect(controls[2]).toHaveAttribute('data-face', 'off')
    const fill = within(toolbar).getByRole('group', { name: 'Fill' })
    await expect(controls[3]).toBe(fill)
    await expect(within(fill).getAllByRole('button')).toHaveLength(2)
    await expect(controls[4]).toHaveAccessibleName('Fade in/out')
    await expect(controls[5]).toHaveAccessibleName('Section reset: restart the section from its first bar')
    await expect(canvasElement.querySelector('.group, .pair, .start-word, .row, .dot')).toBeNull()
  },
}

/** A toolbar laying the helpers out as max-content columns, the grid a `cells` row sits in. */
function inColumns(args: ComponentProps<typeof SectionRow>) {
  return createRawSnippet(() => ({
    render: () =>
      '<div role="toolbar" aria-label="Helpers" style="display: grid; grid-auto-flow: column; grid-auto-columns: max-content; height: 100%"></div>',
    setup: (root: Element) => {
      const row = mount(SectionRow, { target: root, props: args })
      return () => {
        void unmount(row)
      }
    },
  }))
}

/**
 * The helpers in cells (`cells`, `groups` helpers) in max-content columns: Metronome with its ▾ as
 * two halves of one outlined cell (lit: on), Unison, ?, then Panic in the warning hue, set apart.
 */
export const HelperCells: Story = {
  args: { metronome: true, groups: 'helpers', cells: true },
  parameters: { sample: { width: 610, height: 34 } },
  render: (args) => ({
    // GoldenGrid hosts the story; Storybook types `Component` and `props` as SectionRow's.
    Component: GoldenGrid as unknown as typeof SectionRow,
    props: { columns: 1, name: 'Helpers', children: inColumns(args) } as unknown as typeof args,
  }),
  play: async ({ canvasElement }) => {
    const toolbar = within(canvasElement).getByRole('toolbar', { name: 'Helpers' })
    const controls = [...toolbar.children]
    await expect(controls).toHaveLength(4)
    const metronome = within(toolbar).getByRole('group', { name: 'Metronome' })
    await expect(controls[0]).toBe(metronome)
    const halves = within(metronome).getAllByRole('button')
    await expect(halves).toHaveLength(2)
    await expect(halves[0]).toHaveAttribute('data-face', 'on')
    await expect(controls[1]).toHaveTextContent('Unison')
    await expect(controls[2]).toHaveTextContent('?')
    await expect(controls[3]).toHaveAccessibleName('Panic: all notes off')
  },
}

/** Stopped, with Sync Start, Fade, Metronome (settings open), Unison and help on. */
export const AllOn: Story = {
  args: {
    running: false,
    syncStart: true,
    fading: true,
    metronome: true,
    metronomeOpen: true,
    unison: true,
    help: true,
  },
}
