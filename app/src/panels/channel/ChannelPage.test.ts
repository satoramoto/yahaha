// ChannelPage on a MockSession: the page draws the open part from the session's state, and its
// controls change it (commands through model.ts), its parts and tabs through channelNav.

import { cleanup, fireEvent, render, screen } from '@testing-library/svelte'
import { flushSync } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MockSession } from '../../lib/api/mock'
import { app, ui } from '../../lib/store.svelte'
import { stagePage } from '../stage/page.svelte'
import ChannelPage from './ChannelPage.svelte'
import { channelNav } from './nav.svelte'

const tipAction = () => {}

function setup(part = 0) {
  const session = new MockSession({ demo: true, manual: true })
  session.advance(16)
  app.attach(session)
  ui.selectedPart = part
  flushSync()
  render(ChannelPage, { tipAction })
  return session
}

afterEach(() => {
  cleanup()
  app.detach()
  channelNav.close()
  ui.selectedPart = 0
  ui.view = 'stage'
  stagePage.page = 'stage'
})

describe('ChannelPage', () => {
  it('shows the open part: its name, the parts list with it open, the Mix tab', () => {
    const s = setup()
    expect(screen.getByRole('heading', { name: s.state.keyboardParts[0].name })).toBeTruthy()
    const open = screen.getByRole('button', { name: /^Part 1 of 12: R1 .*open$/ })
    expect(open.getAttribute('aria-current')).toBe('true')
    expect(screen.getByRole('tab', { name: /^Mix/ }).getAttribute('aria-selected')).toBe('true')
  })

  it('the header shows the open part\'s CPU share from the meters, with its tooltip', async () => {
    const s = setup()
    const m = await s.meters()
    const share = (part: number) => {
      const ch = part < 4 ? s.state.keyboardParts[part].channel : s.state.mixer.styleParts[part - 4].channel
      return m.channels.find((c) => c.channel === ch)!.cpu
    }
    const shown = () => document.querySelector('[data-tip="mixer.cpu"]')?.textContent?.replace(/\s+/g, ' ').trim()
    // The page reads the meters when it opens.
    await vi.waitFor(() => {
      flushSync()
      expect(shown()).toBe(`CPU ${(share(0) * 100).toFixed(1)}%`)
    })
    expect(share(0)).toBeGreaterThan(0)
    // Another part open: its own share.
    ui.selectedPart = 4
    flushSync()
    expect(share(4)).not.toBe(share(0))
    expect(shown()).toBe(`CPU ${(share(4) * 100).toFixed(1)}%`)
  })

  it('Level sends the part\'s volume', async () => {
    const s = setup()
    const before = s.state.keyboardParts[0].volume
    const level = screen.getByRole('slider', { name: 'Level' })
    await fireEvent.keyDown(level, { key: before >= 127 ? 'ArrowLeft' : 'ArrowRight' })
    s.advance(16)
    expect(s.state.keyboardParts[0].volume).toBe(before >= 127 ? before - 1 : before + 1)
  })

  it('a Style part\'s level sends its Style volume', async () => {
    const s = setup(4)
    const before = s.state.mixer.styleParts[0].volume
    await fireEvent.keyDown(screen.getByRole('slider', { name: 'Level' }), { key: 'Home' })
    s.advance(16)
    expect(before).toBeGreaterThan(0)
    expect(s.state.mixer.styleParts[0].volume).toBe(0)
  })

  it('a parts list entry opens that part, and a keyboard part becomes the selected part', async () => {
    const s = setup()
    await fireEvent.click(screen.getByRole('button', { name: /^Part 2 of 12/ }))
    s.advance(16)
    flushSync()
    expect(ui.selectedPart).toBe(1)
    expect(stagePage.page).toBe('channel')
    expect(s.state.keyboardParts[1].selected).toBe(true)
    expect(screen.getByRole('heading', { name: s.state.keyboardParts[1].name })).toBeTruthy()
  })

  it('◀ from Right 1 opens Phrase 2', async () => {
    setup()
    await fireEvent.click(screen.getByRole('button', { name: /^Previous part/ }))
    expect(ui.selectedPart).toBe(11)
  })

  it('a tab shows its group and is remembered', async () => {
    setup()
    await fireEvent.click(screen.getByRole('tab', { name: 'Compressor' }))
    expect(channelNav.tab).toBe('comp')
    expect(screen.getByRole('slider', { name: 'Threshold' })).toBeTruthy()
  })

  it('the compressor On lamp toggles the strip compressor', async () => {
    const s = setup()
    channelNav.tab = 'comp'
    flushSync()
    const before = s.state.keyboardParts[0].strip.comp.on
    await fireEvent.click(screen.getByRole('button', { name: /^Compressor (on|off)$/ }))
    s.advance(16)
    expect(s.state.keyboardParts[0].strip.comp.on).toBe(!before)
  })

  it('the sound opens Library › Sounds on the part', async () => {
    setup(1)
    await fireEvent.click(screen.getByRole('button', { name: /sound: .*Opens Library › Sounds/ }))
    expect(ui.view).toBe('library')
    expect(ui.libraryTab).toBe('sounds')
    expect(ui.libraryPart).toBe(1)
  })

  it('Edit opens the plugin editor for the part', async () => {
    const s = setup()
    const spy = vi.spyOn(app, 'pluginEditor')
    s.send({ type: 'setPartPlugin', part: 0, id: 'aumu Smp7 Fake', state: null })
    s.advance(5000)
    flushSync()
    expect(s.state.keyboardParts[0].plugin?.editor).toBe(true)
    await fireEvent.click(screen.getByRole('button', { name: 'Open the plugin editor' }))
    expect(spy).toHaveBeenCalledWith(0, true)
    spy.mockRestore()
  })
})
