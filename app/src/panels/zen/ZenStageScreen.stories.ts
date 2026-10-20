import type { Meta, StoryObj } from '@storybook/svelte-vite'
import { MockSession, type MockOptions } from '../../lib/api/mock'
import { app } from '../../lib/store.svelte'
import ZenStageScreen from './ZenStageScreen.svelte'

/**
 * The pilot of zen's Svelte Stage, wired to the app's store on a still mock session (`manual`:
 * no clock runs, so the frame holds). Its controls send to that mock, as the app's do.
 */
const meta = {
  title: 'Screens/Zen Stage',
  component: ZenStageScreen,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof ZenStageScreen>
export default meta

type Story = StoryObj<typeof meta>

/** Attaches a mock session in `opts` to the app's store for the story, and detaches it after. */
const withMock = (opts: MockOptions) => () => {
  const session = new MockSession({ manual: true, ...opts })
  app.attach(session)
  return () => {
    app.detach()
    session.dispose()
  }
}

/** The mock's default state: the demo mid-song (Main B, a chord held). */
export const Default: Story = { beforeEach: withMock({}) }

/** The first run: stopped, a new rack, no One Touch, no Launchkey. */
export const FirstRun: Story = { beforeEach: withMock({ scenario: 'firstRun' }) }
