import type { Meta, StoryObj } from '@storybook/svelte-vite'
import { expect, fn, userEvent, within } from 'storybook/test'
import Settings from './Settings.svelte'
import { settingsBoard } from './Settings.fixtures'
import SettingsPlayground from './SettingsPlayground.svelte'

/** Groups a callback's control under its component. */
const on = (category: string, names: string[]) =>
  Object.fromEntries(names.map((name) => [name, { table: { category } }]))

const CALLBACKS: Record<string, string[]> = {
  AppBar: ['onchoose', 'onhealth'],
  SectionRow: [
    'onstartstop',
    'onaccomp',
    'onsyncstart',
    'onreset',
    'onfillup',
    'onfilldown',
    'onfade',
    'onmetronome',
    'onmetronomesettings',
    'onunison',
    'onpanic',
    'onhelp',
  ],
  PageList: ['onpage'],
  SettingsChord: ['onchord'],
  SettingsStyle: ['onstyle'],
  SettingsKeyboard: ['onkeyboard'],
  SettingsPedals: ['onpedals'],
  SettingsSystem: ['onsystem'],
  SettingsLaunchkey: ['onlaunchkey'],
  StatusLine: ['onclear'],
}

const actions = Object.fromEntries(Object.values(CALLBACKS).flatMap((names) => names.map((name) => [name, fn()])))

const PAGES = ['chord', 'style', 'keyboard', 'pedals', 'system', 'launchkey']

/**
 * The Settings page at the app's 1440 × 900, in place of the Stage: the app bar (Settings chosen),
 * the section row, the compact now-playing block over the six pages as a list, the open page under
 * its header, the status line and the keys. Each region's data is one object control; each page's
 * changes go out through its own callback, an action grouped under its component.
 */
const meta = {
  title: 'Screens/Settings',
  component: Settings,
  parameters: { layout: 'fullscreen' },
  args: { ...settingsBoard, tipAction: fn(), ...actions },
  argTypes: {
    appBar: { control: 'object', table: { category: 'AppBar' } },
    sectionRow: { control: 'object', table: { category: 'SectionRow' } },
    nowPlaying: { control: 'object', table: { category: 'NowPlayingCompact' } },
    pages: { control: 'object', table: { category: 'PageList' } },
    page: { control: 'select', options: PAGES, table: { category: 'PageList' } },
    chord: { control: 'object', table: { category: 'SettingsChord' } },
    style: { control: 'object', table: { category: 'SettingsStyle' } },
    keyboard: { control: 'object', table: { category: 'SettingsKeyboard' } },
    pedals: { control: 'object', table: { category: 'SettingsPedals' } },
    system: { control: 'object', table: { category: 'SettingsSystem' } },
    launchkey: { control: 'object', table: { category: 'SettingsLaunchkey' } },
    status: { control: 'object', table: { category: 'StatusLine' } },
    keys: { control: 'object', table: { category: 'Keys' } },
    ...Object.assign({}, ...Object.entries(CALLBACKS).map(([category, names]) => on(category, names))),
  },
} satisfies Meta<typeof Settings>

export default meta
type Story = StoryObj<typeof meta>

/** The Chord & Split board: Fingered, split F#2 (locked), the page list with each page's summary. */
export const Chord: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    const list = canvas.getByRole('navigation', { name: 'Settings pages' })
    await expect(within(list).getByRole('button', { name: /Chord & Split/ })).toHaveAttribute('aria-current', 'page')
    await expect(canvas.getByRole('heading', { name: 'Chord & Split' })).toBeInTheDocument()
    await userEvent.click(within(list).getByRole('button', { name: /System/ }))
    await expect(args.onpage).toHaveBeenCalledWith('system')
    await userEvent.click(canvas.getByRole('button', { name: /^Upper/ }))
    await expect(args.onchord).toHaveBeenCalledWith({ type: 'upper', on: true })
  },
}

/** The Style page open. */
export const Style: Story = {
  args: { page: 'style' },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole('heading', { name: 'Style' })).toBeInTheDocument()
    await userEvent.click(within(canvas.getByRole('tablist', { name: /Main timing/ })).getByRole('tab', { name: 'Immediate' }))
    await expect(args.onstyle).toHaveBeenCalledWith({ key: 'mainTiming', value: 'immediate' })
  },
}

/** The Keyboard page open: Transpose and Parameter lock. */
export const Keyboard: Story = {
  args: { page: 'keyboard' },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: 'Keyboard transpose up a semitone' }))
    await expect(args.onkeyboard).toHaveBeenCalledWith({ type: 'keyboardStep', delta: 1 })
  },
}

/** The Pedals page open. */
export const Pedals: Story = {
  args: { page: 'pedals' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole('table', { name: 'Pedals' })).toBeVisible()
  },
}

/** The System page open: Audio, MIDI, Library and the theme. */
export const System: Story = {
  args: { page: 'system' },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('tab', { name: 'Light' }))
    await expect(args.onsystem).toHaveBeenCalledWith({ type: 'theme', theme: 'light' })
  },
}

/** The Launchkey page open: the pad page order. */
export const Launchkey: Story = {
  args: { page: 'launchkey' },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: 'Move Racks down' }))
    await expect(args.onlaunchkey).toHaveBeenCalledWith({ type: 'move', id: 'racks', delta: 1 })
  },
}

/**
 * Play with the screen: every control responds. A story-only wrapper (`SettingsPlayground.svelte`)
 * keeps what you change, seeded from the args; each change still logs in the Actions panel. The
 * page list switches pages and its summaries follow (fingering and split, Main timing, transpose,
 * pedal CCs, pad pages shown); the split moves with − + and the page keyboard; the lock link opens
 * the Keyboard page; the theme tabs switch the screen's theme.
 */
export const Playground: Story = {
  render: (args) => ({ Component: SettingsPlayground, props: args }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const list = canvas.getByRole('navigation', { name: 'Settings pages' })
    await userEvent.click(canvas.getByRole('button', { name: 'Split point one key up' }))
    await expect(within(list).getByRole('button', { name: /Chord & Split/ })).toHaveTextContent('G2')
    await userEvent.click(within(list).getByRole('button', { name: /Keyboard/ }))
    await expect(within(list).getByRole('button', { name: /Keyboard/ })).toHaveAttribute('aria-current', 'page')
    await expect(canvas.getByRole('heading', { name: 'Keyboard' })).toBeInTheDocument()
  },
}
