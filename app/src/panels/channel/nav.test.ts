// channelNav (nav.svelte.ts): the part opener and the page's close; a Launchkey part select
// (`surface.partSelectSeq` moving) opens Channel on the selected part, and a part becoming
// selected any other way doesn't.

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

describe('a Launchkey part select (surface.partSelectSeq)', () => {
  /** Every command the session got from the app. */
  function spy(s: MockSession) {
    const sent: unknown[] = []
    const send = s.send.bind(s)
    s.send = (cmd) => {
      sent.push(cmd)
      send(cmd)
    }
    return sent
  }

  it('opens the Channel page on the selected part, from any page, without a selectPart of its own', () => {
    const s = attach()
    const sent = spy(s)
    ui.view = 'library'
    stagePage.page = 'effects'
    s.hardwareSelectPart(2)
    flushSync()
    expect(stagePage.page).toBe('channel')
    expect(ui.view).toBe('stage')
    expect(ui.selectedPart).toBe(2)
    expect(sent).toEqual([])
    // Each select opens it again, even of the part already open.
    stagePage.page = 'stage'
    s.hardwareSelectPart(2)
    flushSync()
    expect(stagePage.page).toBe('channel')
    s.hardwareSelectPart(1)
    flushSync()
    expect(ui.selectedPart).toBe(1)
  })

  it('the first state is a baseline: a session whose counter already moved opens nothing', () => {
    const s = new MockSession({ demo: true, manual: true })
    s.hardwareSelectPart(3)
    s.hardwareSelectPart(1)
    app.attach(s)
    s.advance(16)
    flushSync()
    expect(stagePage.page).toBe('stage')
    expect(ui.selectedPart).toBe(0)
  })

  it('app selects, F-key selects, sound picks, channelNav.show and rack loads never open it', () => {
    const s = attach()
    const changes: string[] = []
    const step = (what: string, f: () => void) => {
      f()
      s.advance(16)
      flushSync()
      if (stagePage.page !== 'stage' || ui.selectedPart !== 0) changes.push(what)
      stagePage.page = 'stage'
      ui.selectedPart = 0
    }
    for (const part of [1, 2, 3, 0]) step(`selectPart ${part}`, () => app.send({ type: 'selectPart', part }))
    step('assignSound', () => app.send({ type: 'assignSound', part: 2, id: 'sf:GeneralUser-GS.sf2:0:33' }))
    step('storeRack', () => app.send({ type: 'storeRack', slot: 0 }))
    step('selectPart before a load', () => app.send({ type: 'selectPart', part: 3 }))
    step('pressQuickRack', () => app.send({ type: 'pressQuickRack', slot: 0, discard: true }))
    expect(changes).toEqual([])
    // channelNav.show opens Channel itself; the selectPart it sends opens nothing more.
    channelNav.show(1)
    s.advance(16)
    flushSync()
    stagePage.page = 'stage'
    s.advance(16)
    flushSync()
    expect(stagePage.page).toBe('stage')
    expect(s.state.surface.partSelectSeq).toBe(0)
  })

  it('after attaching a new session, its first state is a baseline again', () => {
    const a = attach()
    a.hardwareSelectPart(1)
    flushSync()
    expect(stagePage.page).toBe('channel')
    stagePage.page = 'stage'
    // A new session whose counter differs from the old one's: nothing opens on its first state.
    const b = new MockSession({ demo: true, manual: true })
    app.attach(b)
    b.advance(16)
    flushSync()
    expect(b.state.surface.partSelectSeq).not.toBe(a.state.surface.partSelectSeq)
    expect(stagePage.page).toBe('stage')
    // Its own selects open it.
    b.hardwareSelectPart(2)
    flushSync()
    expect([stagePage.page, ui.selectedPart]).toEqual(['channel', 2])
    // And the old session, detached, opens nothing.
    stagePage.page = 'stage'
    a.hardwareSelectPart(3)
    flushSync()
    expect(stagePage.page).toBe('stage')
  })
})
