// SettingsScreen on a MockSession: the library's Settings screen draws the session's state, its
// page list switches pages, and its controls change the session.

import { cleanup, fireEvent, render } from '@testing-library/svelte'
import { flushSync } from 'svelte'
import { afterEach, describe, expect, it } from 'vitest'
import { MockSession } from '../../lib/api/mock'
import { app, ui } from '../../lib/store.svelte'
import { stagePage } from '../stage/page.svelte'
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

  it('another page tab leaves Settings for that page', async () => {
    setup()
    ui.settings = true
    const tab = [...document.querySelectorAll<HTMLButtonElement>('nav[aria-label="Pages"] button')].find((b) => b.textContent?.trim() === 'Effects')!
    await fireEvent.click(tab)
    expect(ui.settings).toBe(false)
    expect(stagePage.page).toBe('effects')
  })
})
