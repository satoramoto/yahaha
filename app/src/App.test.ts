// The app shell (App.svelte): the Stage screen (panels/stage/StageScreen) in a scaler that
// carries the kit's theme, over the help footer; Library in the Stage's place; the page tabs
// other than Stage showing "Coming soon" until Esc or the Stage tab; and a Stage control
// sending its command to the session.

import { cleanup, fireEvent, render, screen } from '@testing-library/svelte'
import { flushSync } from 'svelte'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App.svelte'
import { MockSession } from './lib/api/mock'
import { ui } from './lib/store.svelte'
import { stagePage } from './panels/stage/page.svelte'

afterEach(() => {
  cleanup()
  ui.view = 'stage'
  ui.libraryTab = 'sounds'
  ui.libraryPart = 0
  ui.effects = false
  stagePage.page = 'stage'
})

function setup() {
  const session = new MockSession({ demo: true, manual: true })
  render(App, { props: { session } })
  session.advance(16)
  flushSync()
  return session
}

const scaler = () => document.querySelector<HTMLElement>('.app > main .scaler[data-theme]')
const tab = (label: string) =>
  [...document.querySelectorAll<HTMLButtonElement>('nav[aria-label="Pages"] button')].find((b) => b.textContent?.trim() === label)!

describe('the shell', () => {
  it('mounts the Stage, scaled in a themed box, with the help footer below it', () => {
    setup()
    const box = scaler()
    expect(box).toBeTruthy()
    expect(box!.dataset.theme).toBe(ui.theme)
    expect(box!.querySelector('section[aria-label="Faders"]')).toBeTruthy()
    expect(box!.querySelector('nav[aria-label="Pages"]')).toBeTruthy()
    expect(box!.querySelector('[role="toolbar"][aria-label="Transport, switches and helpers"]')).toBeTruthy()
    // The column: the Stage's slot first, the help footer after it.
    const column = [...document.querySelector('.app')!.children]
    expect(column).toHaveLength(2)
    expect(column[0].classList.contains('stage-slot')).toBe(true)
    expect(column[0].contains(box)).toBe(true)
    expect(column[1].matches('footer.help-footer[aria-label="Help"]')).toBe(true)
  })

  it('shows Library in the Stage\'s place while ui.view is library', () => {
    setup()
    ui.openLibrary('sounds', 0)
    flushSync()
    expect(scaler()).toBeNull()
    expect(document.querySelector('.app > main.library-slot')).toBeTruthy()
    ui.view = 'stage'
    flushSync()
    expect(scaler()).toBeTruthy()
    expect(document.querySelector('.app > main.library-slot')).toBeNull()
  })
})

describe('page tabs', () => {
  it('Effects shows Coming soon; Esc comes back to the Stage', async () => {
    setup()
    expect(screen.queryByText('Coming soon')).toBeNull()
    await fireEvent.click(tab('Effects'))
    flushSync()
    expect(stagePage.page).toBe('effects')
    expect(screen.getByLabelText('Effects: coming soon').textContent).toContain('Coming soon')
    expect(document.querySelector('section[aria-label="Faders"]')).toBeNull()
    expect(tab('Effects').getAttribute('aria-current')).toBe('page')
    await fireEvent.keyDown(window, { key: 'Escape' })
    flushSync()
    expect(stagePage.page).toBe('stage')
    expect(screen.queryByText('Coming soon')).toBeNull()
    expect(document.querySelector('section[aria-label="Faders"]')).toBeTruthy()
  })

  it('a full tab (Settings) shows Coming soon; the Stage tab comes back', async () => {
    setup()
    await fireEvent.click(tab('Settings'))
    flushSync()
    expect(screen.getByLabelText('Settings: coming soon')).toBeTruthy()
    await fireEvent.click(tab('Stage'))
    flushSync()
    expect(stagePage.page).toBe('stage')
    expect(screen.queryByText('Coming soon')).toBeNull()
  })

  it('Esc closes a drawer open over the Stage before it leaves a page', async () => {
    setup()
    await fireEvent.click(tab('Looper'))
    ui.effects = true
    flushSync()
    await fireEvent.keyDown(window, { key: 'Escape' })
    expect(ui.effects).toBe(false)
    expect(stagePage.page).toBe('looper')
    await fireEvent.keyDown(window, { key: 'Escape' })
    expect(stagePage.page).toBe('stage')
  })
})

describe('the Stage\'s controls', () => {
  it('Accomp toggles the session\'s accompaniment', async () => {
    const session = setup()
    const before = session.state.transport.acmp
    const accomp = document.querySelector<HTMLButtonElement>('.scaler [data-tip="transport.acmp"]')!
    expect(accomp.getAttribute('aria-pressed')).toBe(String(before))
    await fireEvent.click(accomp)
    session.advance(16)
    flushSync()
    expect(session.state.transport.acmp).toBe(!before)
    expect(accomp.getAttribute('aria-pressed')).toBe(String(!before))
  })
})
