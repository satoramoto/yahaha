// channelNav (nav.svelte.ts), the Channel view's open state: a mixer strip's name opens it on
// that part and the same strip again closes it; while the Details layer is shown a name only
// selects the part; ChannelView's ‹ › step the selected part and × closes; Esc in the app
// closes it, but first what is open over the stage.
//
// The shell no longer mounts the mixer row or the Channel view (the Stage's page tabs will
// bring Channel back), so the row and the view are rendered here wired as the old shell
// wired them: the row's clicks seen first by `stripClick`, the view's callbacks on
// `show` / `close`.

import { cleanup, fireEvent, render } from '@testing-library/svelte'
import { flushSync } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from '../../App.svelte'
import { MockSession } from '../../lib/api/mock'
import { app, ui } from '../../lib/store.svelte'
import { stagePage } from '../stage/page.svelte'
import MixerRow from '../mixer/MixerRow.svelte'
import ChannelView from './ChannelView.svelte'
import { channelNav } from './nav.svelte'

afterEach(() => {
  cleanup()
  app.detach()
  channelNav.close()
  ui.selectedPart = 0
  ui.effects = false
  ui.mixer = false
  stagePage.page = 'stage'
})

function attach() {
  const session = new MockSession({ demo: true, manual: true })
  app.attach(session)
  session.advance(16)
  flushSync()
  return session
}

/** The mixer row, its clicks seen by channelNav before the strip handles them. */
function mixerRow() {
  const session = attach()
  const { container } = render(MixerRow)
  container.addEventListener('click', (e) => channelNav.stripClick(e), { capture: true })
  return session
}

const stripName = (part: number) => document.querySelector<HTMLElement>(`[data-part="${part}"] [data-tip="mixer.strip.select"]`)!

function clickStrip(part: number) {
  stripName(part).click()
  flushSync()
}

describe('a strip name and the Channel view', () => {
  it('opens on the clicked strip and closes when it is clicked again', () => {
    mixerRow()
    expect(channelNav.open).toBe(false)
    clickStrip(2)
    expect(channelNav.open).toBe(true)
    expect(ui.selectedPart).toBe(2)
    clickStrip(5)
    expect(channelNav.open).toBe(true)
    expect(ui.selectedPart).toBe(5)
    clickStrip(5)
    expect(channelNav.open).toBe(false)
  })

  it('with the Details layer shown a strip name only selects the part', () => {
    mixerRow()
    ui.mixer = true
    flushSync()
    clickStrip(2)
    expect(ui.selectedPart).toBe(2)
    expect(channelNav.open).toBe(false)
    ui.mixer = false
    flushSync()
    clickStrip(2)
    expect(channelNav.open).toBe(true)
    ui.mixer = true
    flushSync()
    clickStrip(2)
    expect(channelNav.open).toBe(true)
  })

  it('show selects the part, and a keyboard part on the session too', () => {
    const session = attach()
    const sent = vi.spyOn(session, 'send')
    channelNav.show(6)
    expect([channelNav.open, ui.selectedPart]).toEqual([true, 6])
    expect(sent).not.toHaveBeenCalled()
    channelNav.show(1)
    expect(ui.selectedPart).toBe(1)
    expect(sent).toHaveBeenCalledWith({ type: 'selectPart', part: 1 })
  })
})

describe('ChannelView wired to channelNav', () => {
  it('‹ › step the selected part and × closes', async () => {
    const session = attach()
    const sent = vi.spyOn(session, 'send')
    channelNav.show(0)
    const view = () => ({ part: ui.selectedPart, onpart: (p: number) => channelNav.show(p), onclose: () => channelNav.close() })
    const { rerender } = render(ChannelView, { props: view() })
    const press = async (tip: string) => {
      await fireEvent.click(document.querySelector<HTMLElement>(`[data-tip="${tip}"]`)!)
      await rerender(view())
      flushSync()
    }
    await press('mixer.channel.prev')
    expect(ui.selectedPart).toBe(11)
    await press('mixer.channel.next')
    await press('mixer.channel.next')
    expect(ui.selectedPart).toBe(1)
    expect(sent).toHaveBeenCalledWith({ type: 'selectPart', part: 1 })
    expect(document.querySelector('section.channel')?.getAttribute('aria-label')).toBe('Right 2 channel')
    await press('mixer.channel.close')
    expect(channelNav.open).toBe(false)
  })
})

describe('Esc in the app', () => {
  it('closes the Channel view, but first what is open over the stage', async () => {
    render(App, { props: { session: new MockSession({ demo: true, manual: true }) } })
    flushSync()
    channelNav.show(0)
    ui.effects = true
    flushSync()
    await fireEvent.keyDown(window, { key: 'Escape' })
    expect(ui.effects).toBe(false)
    expect(channelNav.open).toBe(true)
    await fireEvent.keyDown(window, { key: 'Escape' })
    expect(channelNav.open).toBe(false)
  })
})
