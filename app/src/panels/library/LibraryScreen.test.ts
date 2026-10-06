// The Library screen in the app (LibraryScreen): opened from the app bar, its page tabs, and each
// page reaching the session on the mock. The pages' props and commands are unit-tested in their
// models (stylesModel, soundsModel, instrumentsModel, racksModel); this checks the wiring.

import { cleanup, fireEvent, render } from '@testing-library/svelte'
import { flushSync } from 'svelte'
import { afterEach, describe, expect, it } from 'vitest'
import App from '../../App.svelte'
import { MockSession } from '../../lib/api/mock'
import { app, ui } from '../../lib/store.svelte'
import { stagePage } from '../stage/page.svelte'
import { libraryNav } from './nav.svelte'
import { racksState } from './racksState.svelte'
import { soundsPage } from './soundsState.svelte'

afterEach(() => {
  cleanup()
  ui.view = 'stage'
  ui.libraryTab = 'sounds'
  ui.libraryPart = 0
  ui.rack = false
  libraryNav.reset()
  soundsPage.reset()
  racksState.reset()
  stagePage.page = 'stage'
})

function setup(stopped = false) {
  const session = new MockSession({ demo: true, manual: true })
  render(App, { props: { session } })
  if (stopped) session.send({ type: 'stop' })
  session.advance(16)
  flushSync()
  return session
}

function step(session: MockSession) {
  session.advance(16)
  flushSync()
}

const page = () => document.querySelector<HTMLElement>('section[aria-label^="Library:"]')
const libraryTab = (word: string) =>
  [...document.querySelectorAll<HTMLButtonElement>('[role="tablist"][aria-label="Library pages"] [role="tab"]')].find((t) =>
    t.textContent!.trim().startsWith(word),
  )!
const options = () => [...page()!.querySelectorAll<HTMLElement>('[role="option"]')]

describe('Library screen', () => {
  it('the app bar\'s Library tab opens it; its page tabs switch the page', async () => {
    const session = setup()
    const bar = [...document.querySelectorAll<HTMLButtonElement>('nav[aria-label="Pages"] button')].find((b) => b.textContent?.trim() === 'Library')!
    await fireEvent.click(bar)
    step(session)
    expect(ui.view).toBe('library')
    expect(page()).toBeTruthy()
    for (const [word, id] of [['Styles', 'styles'], ['Instruments', 'instruments'], ['Racks', 'racks'], ['Sounds', 'sounds']] as const) {
      await fireEvent.click(libraryTab(word))
      step(session)
      expect(ui.libraryTab).toBe(id)
      expect(page()!.getAttribute('aria-label')).toBe(`Library: ${word}`)
    }
    // The counts ride on the tabs.
    expect(libraryTab('Styles').textContent).toMatch(/Styles [\d,]+/)
  })

  it('has no transport row; Panic and help mode\'s ? sit at the foot of the left column', async () => {
    const session = setup()
    ui.view = 'library'
    step(session)
    expect(document.querySelector('[data-tip="transport.start_stop"]')).toBeNull()
    expect(document.querySelector('[data-tip="transport.acmp"]')).toBeNull()
    expect(page()!.querySelector('[data-tip="transport.panic"]')).toBeTruthy()
    const help = page()!.querySelector<HTMLButtonElement>('[data-tip="app.help"]')!
    await fireEvent.click(help)
    step(session)
    expect(help.getAttribute('aria-pressed')).toBe('true')
  })

  it('Styles: the filter narrows the list; Load loads the highlighted style and goes back to the Stage', async () => {
    const session = setup(true)
    ui.openLibrary('styles')
    step(session)
    const all = options().length
    expect(all).toBeGreaterThan(1)
    const loaded = session.state.style.id
    const name = app.library.entries.find((e) => e.id !== loaded && e.status === 'ok')!.name
    const filter = page()!.querySelector<HTMLInputElement>('input[type="search"]')!
    await fireEvent.input(filter, { target: { value: name } })
    step(session)
    expect(options().length).toBeLessThan(all)
    expect(options().length).toBeGreaterThan(0)
    const row = options().find((o) => o.textContent!.includes(name))!
    await fireEvent.click(row)
    step(session)
    const load = page()!.querySelector<HTMLButtonElement>('[data-tip="library.style_load"]')!
    await fireEvent.click(load)
    step(session)
    expect(session.state.style.name).toBe(name)
    expect(ui.view).toBe('stage')
  })

  it('Sounds: a click plays the sound on the target part', async () => {
    const session = setup()
    ui.openLibrary('sounds', 1)
    step(session)
    const before = session.state.keyboardParts[1].voiceName
    const row = options().find((o) => o.getAttribute('aria-selected') !== 'true')!
    await fireEvent.click(row)
    step(session)
    const after = session.state.keyboardParts[1]
    expect(after.voiceName !== before || after.sound !== null).toBe(true)
    expect(row.getAttribute('aria-selected')).toBe('true')
  })

  it('Quick Racks: Store arms from the left column; Clear armed empties the slot pressed next', async () => {
    const session = setup()
    ui.openLibrary('racks')
    step(session)
    await fireEvent.click(document.querySelector<HTMLElement>('[data-tip="quick.store"]')!)
    step(session)
    expect(session.state.quickRacks.store).toBe(true)
    // Store on a slot asks for a name first: save the live rack there as the Store flow does.
    session.send({ type: 'pressQuickRack', slot: 0 })
    session.send({ type: 'saveRackAs', name: 'Ballad' })
    step(session)
    expect(session.state.quickRacks.buttons[0].rack).not.toBeNull()
    await fireEvent.click(document.querySelector<HTMLElement>('[data-tip="quick.clear"]')!)
    step(session)
    await fireEvent.click(document.querySelector<HTMLElement>('[data-tip="quick.1"]')!)
    step(session)
    expect(session.state.quickRacks.buttons[0].rack).toBeNull()
  })

  it('the Stage\'s Browse (the style line) opens Library › Styles', async () => {
    const session = setup()
    await fireEvent.click(document.querySelector<HTMLElement>('.scaler [data-tip="browser.open"]')!)
    step(session)
    expect(ui.view).toBe('library')
    expect(ui.libraryTab).toBe('styles')
    expect(ui.browser).toBe(false)
  })
})
