// SettingsScreen on a MockSession: the library's Settings screen draws the session's state, its
// page list switches pages, and its controls change the session.

import { cleanup, fireEvent, render } from '@testing-library/svelte'
import { flushSync } from 'svelte'
import { afterEach, describe, expect, it } from 'vitest'
import { MockSession } from '../../lib/api/mock'
import { app, ui } from '../../lib/store.svelte'
import { stagePage } from '../stage/page.svelte'
import { splitPick } from '../stage/splitPick.svelte'
import { keys } from '../stage/model'
import { rangeFor } from '../keystrip/keyboard'
import { layout } from '../../ui/Keys/keys'
import { nav } from './nav.svelte'
import SettingsScreen from './SettingsScreen.svelte'

function setup(edit?: (s: MockSession) => void) {
  const session = new MockSession({ demo: true, manual: true })
  session.advance(16)
  edit?.(session)
  app.attach(session)
  flushSync()
  render(SettingsScreen)
  return session
}

afterEach(() => {
  cleanup()
  app.detach()
  nav.tab = 'chord'
  ui.settings = false
  stagePage.page = 'stage'
  splitPick.armed = false
})

const pageList = () => document.querySelector<HTMLElement>('nav[aria-label="Settings pages"]')!
const pageButton = (tip: string) => pageList().querySelector<HTMLButtonElement>(`[data-tip="${tip}"]`)!
const current = () => pageList().querySelector('[aria-current="page"]')
const control = (tip: string) => document.querySelector<HTMLElement>(`.scaler [data-tip="${tip}"]`)!

describe('SettingsScreen', () => {
  it('draws the screen, scaled in a themed box, with Settings the current page tab', () => {
    const s = setup()
    const box = document.querySelector<HTMLElement>('.scaler[data-theme]')!
    expect(box.dataset.theme).toBe(ui.theme)
    expect(pageList()).toBeTruthy()
    expect(document.body.textContent).toContain(s.state.style.name)
    const tab = [...document.querySelectorAll<HTMLButtonElement>('nav[aria-label="Pages"] button')].find((b) => b.textContent?.trim() === 'Settings')
    expect(tab?.getAttribute('aria-current')).toBe('page')
  })

  it('the page list switches pages, kept in nav', async () => {
    setup()
    expect(current()?.textContent).toContain('Chord & Split')
    await fireEvent.click(pageButton('settings.tab.system'))
    flushSync()
    expect(nav.page).toBe('system')
    expect(nav.tab).toBe('audio')
    expect(current()?.textContent).toContain('System')
    expect(control('midi.input') ?? control('app.theme')).toBeTruthy()
    await fireEvent.click(pageButton('settings.tab.keyboard'))
    flushSync()
    expect(nav.page).toBe('keyboard')
  })

  it('Upper round-trips through the session', async () => {
    const s = setup((s) => (s.state.chord.upper = false))
    await fireEvent.click(control('detection.upper'))
    s.advance(16)
    flushSync()
    expect(s.state.chord.upper).toBe(true)
    expect(control('detection.upper').getAttribute('aria-pressed')).toBe('true')
  })

  it('has no page keyboard and no transport row: one keyboard, at the foot', () => {
    setup()
    expect(document.querySelectorAll('[role="img"][aria-label^="Keys:"]')).toHaveLength(1)
    expect(document.querySelectorAll('[role="slider"][data-tip="settings.split_strip"]')).toHaveLength(1)
    expect(document.querySelector('[role="toolbar"][aria-label^="Transport"]')).toBeNull()
    expect(control('transport.panic')).toBeTruthy()
    expect(pageButton('settings.tab.launchkey').textContent?.trim()).toBe('Controller')
  })

  it('the split is set on the main keyboard: arrows, and "Set on the keys" then a key, black keys included', async () => {
    const s = setup((s) => {
      s.state.paramLocks.splitPoint = false
      s.send({ type: 'setSplit', note: 60 })
      s.advance(16)
    })
    flushSync()
    const handle = document.querySelector<HTMLElement>('[role="slider"][data-tip="settings.split_strip"]')!
    await fireEvent.keyDown(handle, { key: 'ArrowLeft' })
    s.advance(16)
    flushSync()
    expect(s.state.chord.split).toBe(59)

    await fireEvent.click(control('settings.split_pick'))
    flushSync()
    expect(splitPick.armed).toBe(true)
    const pick = document.querySelector<HTMLElement>('.keys .pick')!
    expect(pick).toBeTruthy()
    // jsdom draws nothing, so the strip is at 0,0 and unscaled: F#2's black key centre, up top.
    const { range } = keys(s.state, rangeFor(ui.keyRange, s.state.io.inputs))
    const fs2 = layout(range!, 1392 - 2, 59, [], [], 'r1').blacks.find((k) => k.note === 54)!.x
    await fireEvent.pointerDown(pick, { clientX: fs2 + 1, clientY: 11, button: 0, pointerId: 1 })
    await fireEvent.pointerUp(pick, { clientX: fs2 + 1, clientY: 11, button: 0, pointerId: 1 })
    s.advance(16)
    flushSync()
    expect(s.state.chord.split).toBe(54)
    expect(s.state.chord.splitName).toBe('F#2')
    expect(splitPick.armed).toBe(false)
    expect(document.body.textContent).toContain('F#2')
  })

  it('a locked split point: the keys and "Set on the keys" leave it alone', async () => {
    const s = setup((s) => (s.state.paramLocks.splitPoint = true))
    const before = s.state.chord.split
    const handle = document.querySelector<HTMLElement>('[role="slider"][data-tip="settings.split_strip"]')!
    expect(handle.getAttribute('aria-disabled')).toBe('true')
    await fireEvent.keyDown(handle, { key: 'ArrowRight' })
    await fireEvent.click(control('settings.split_pick'))
    s.advance(16)
    flushSync()
    expect(s.state.chord.split).toBe(before)
    expect(splitPick.armed).toBe(false)
    expect(document.querySelector('.keys .pick')).toBeNull()
  })

  it('another page tab leaves Settings for that page', async () => {
    setup()
    ui.settings = true
    const tab = [...document.querySelectorAll<HTMLButtonElement>('nav[aria-label="Pages"] button')].find((b) => b.textContent?.trim() === 'Effects')!
    await fireEvent.click(tab)
    expect(ui.settings).toBe(false)
    expect(stagePage.page).toBe('effects')
  })
})
