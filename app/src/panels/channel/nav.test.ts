// channelNav (nav.svelte.ts): the part opener and the page's close. A part becoming selected
// elsewhere doesn't open Channel.

import { flushSync } from 'svelte'
import { afterEach, describe, expect, it } from 'vitest'
import { MockSession } from '../../lib/api/mock'
import { app, ui } from '../../lib/store.svelte'
import { stagePage } from '../stage/page.svelte'
import { channelNav } from './nav.svelte'

afterEach(() => {
  app.detach()
  channelNav.close()
  ui.selectedPart = 0
  ui.view = 'stage'
  ui.settings = false
  stagePage.page = 'stage'
})

function attach() {
  const session = new MockSession({ demo: true, manual: true })
  app.attach(session)
  session.advance(16)
  flushSync()
  return session
}

describe('channelNav', () => {
  it('show opens the Channel tab on a keyboard part and selects it', () => {
    const s = attach()
    channelNav.show(2)
    s.advance(16)
    expect(ui.selectedPart).toBe(2)
    expect(stagePage.page).toBe('channel')
    expect(s.state.keyboardParts[2].selected).toBe(true)
  })

  it('show on a Style part opens it without selecting a keyboard part', () => {
    const s = attach()
    const selected = s.state.keyboardParts.map((p) => p.selected)
    channelNav.show(6)
    s.advance(16)
    expect(ui.selectedPart).toBe(6)
    expect(s.state.keyboardParts.map((p) => p.selected)).toEqual(selected)
  })

  it('show wraps the part into 0–11 and leaves Library', () => {
    attach()
    ui.view = 'library'
    channelNav.show(-1)
    expect(ui.selectedPart).toBe(11)
    expect(ui.view).toBe('stage')
  })

  it('close goes back to the Stage and the Mix tab', () => {
    channelNav.tab = 'inserts'
    stagePage.page = 'channel'
    channelNav.close()
    expect(stagePage.page).toBe('stage')
    expect(channelNav.tab).toBe('mix')
  })

  it('Esc is left to stagePage, which goes back to the Stage', () => {
    stagePage.page = 'channel'
    expect(channelNav.escape()).toBe(false)
    expect(stagePage.escape()).toBe(true)
    expect(stagePage.page).toBe('stage')
  })

  it('a part select or a rack load elsewhere leaves the page where it was', () => {
    const s = attach()
    ui.view = 'library'
    s.send({ type: 'selectPart', part: 2 })
    s.advance(16)
    flushSync()
    expect(s.state.keyboardParts[2].selected).toBe(true)
    s.send({ type: 'pressQuickRack', slot: 0 })
    s.advance(16)
    flushSync()
    expect(stagePage.page).toBe('stage')
    expect(ui.view).toBe('library')
  })
})
