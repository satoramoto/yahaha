// The app shell (App.svelte): the Stage screen (panels/stage/StageScreen) in a scaler that
// carries the kit's theme, with no help footer; Library in the Stage's place; the page tabs
// other than Stage showing "Coming soon" until Esc or the Stage tab, and Settings opening the
// Settings drawer; tooltips in the status line; and a Stage control sending its command.

import { cleanup, fireEvent, render, screen } from '@testing-library/svelte'
import { flushSync, tick } from 'svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App.svelte'
import { TIPS, type TipKey } from './help/tooltips'
import { MockSession } from './lib/api/mock'
import { ui } from './lib/store.svelte'
import { CLEAR_MS, tips, TOOLTIP_ID } from './lib/tooltip/tip.svelte'
import { stagePage } from './panels/stage/page.svelte'

afterEach(() => {
  cleanup()
  ui.view = 'stage'
  ui.libraryTab = 'sounds'
  ui.libraryPart = 0
  ui.effects = false
  ui.settings = false
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
  it('mounts the Stage, scaled in a themed box, with no help footer', () => {
    setup()
    const box = scaler()
    expect(box).toBeTruthy()
    expect(box!.dataset.theme).toBe(ui.theme)
    expect(box!.querySelector('section[aria-label="Faders"]')).toBeTruthy()
    expect(box!.querySelector('nav[aria-label="Pages"]')).toBeTruthy()
    expect(box!.querySelector('[role="toolbar"][aria-label="Transport, switches and helpers"]')).toBeTruthy()
    // The column holds the Stage's slot alone.
    const column = [...document.querySelector('.app')!.children]
    expect(column).toHaveLength(1)
    expect(column[0].classList.contains('stage-slot')).toBe(true)
    expect(column[0].contains(box)).toBe(true)
    expect(document.querySelector('footer')).toBeNull()
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

  it('Library, a full tab, shows Coming soon; the Stage tab comes back', async () => {
    setup()
    await fireEvent.click(tab('Library'))
    flushSync()
    expect(screen.getByLabelText('Library: coming soon')).toBeTruthy()
    await fireEvent.click(tab('Stage'))
    flushSync()
    expect(stagePage.page).toBe('stage')
    expect(screen.queryByText('Coming soon')).toBeNull()
  })

  it('the Settings tab opens the Settings drawer over the Stage, and a setting round-trips', async () => {
    const session = setup()
    await fireEvent.click(tab('Settings'))
    flushSync()
    expect(ui.settings).toBe(true)
    expect(stagePage.page).toBe('stage')
    expect(screen.queryByText('Coming soon')).toBeNull()
    expect(tab('Settings').getAttribute('aria-current')).toBe('page')
    const drawer = document.querySelector<HTMLElement>('[role="complementary"]')!
    expect(drawer.querySelector('[role="tablist"][aria-label="Settings pages"]')).toBeTruthy()
    // The Style page's Auto Fill: the change reaches the session and comes back.
    await fireEvent.click(drawer.querySelector<HTMLElement>('[data-tip="settings.tab.style"]')!)
    flushSync()
    const before = session.state.transport.autoFill
    const toggle = drawer.querySelector<HTMLElement>('[data-tip="transport.auto_fill"]')!
    await fireEvent.click(toggle)
    session.advance(16)
    flushSync()
    expect(session.state.transport.autoFill).toBe(!before)
    expect(toggle.textContent).toContain(before ? 'Off' : 'On')
    // Another tab puts the drawer away.
    await fireEvent.click(tab('Stage'))
    flushSync()
    expect(ui.settings).toBe(false)
  })

  it('Alt+T opens the same Settings drawer, with its tab current', async () => {
    setup()
    await fireEvent.keyDown(window, { key: 't', code: 'KeyT', altKey: true })
    flushSync()
    expect(ui.settings).toBe(true)
    expect(tab('Settings').getAttribute('aria-current')).toBe('page')
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

describe('tooltips in the status line', () => {
  const line = () => document.querySelector<HTMLElement>('.scaler p[role="status"]')!
  const hintText = () => line().querySelector('.hint')?.textContent ?? ''
  const control = (key: string) => document.querySelector<HTMLElement>(`.scaler [data-tip="${key}"]`)!
  const hover = (el: HTMLElement) => fireEvent.pointerEnter(el, { pointerType: 'mouse' })
  const leave = (el: HTMLElement) => fireEvent.pointerLeave(el, { pointerType: 'mouse' })

  beforeEach(() => {
    tips.reset()
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
    tips.reset()
  })

  it('hovering a control shows its entry in the status line; leaving brings the message back', async () => {
    const session = setup()
    session.send({ type: 'auditionStyle', id: 1 }) // refused while playing: an error message
    session.advance(16)
    flushSync()
    const message = session.state.message!.text
    expect(line().textContent).toContain(message)

    const accomp = control('transport.acmp')
    await hover(accomp)
    flushSync()
    const t = TIPS['transport.acmp']
    expect(hintText()).toContain(t.title)
    expect(hintText()).toContain(t.body)
    expect(line().querySelector('.hint')!.getAttribute('aria-hidden')).toBe('true')
    // The message stays in the live region, under the hint.
    expect(line().querySelector('button.line.under')!.textContent).toContain(message)

    await leave(accomp)
    vi.advanceTimersByTime(CLEAR_MS)
    flushSync()
    expect(line().querySelector('.hint')).toBeNull()
    expect(line().querySelector('button.line:not(.under)')!.textContent).toContain(message)
  })

  it('an error that arrives during a hover shows; the next control shows its entry again', async () => {
    const session = setup()
    await hover(control('transport.acmp'))
    flushSync()
    expect(hintText()).toContain(TIPS['transport.acmp'].title)
    session.send({ type: 'auditionStyle', id: 1 })
    session.advance(16)
    flushSync()
    expect(line().querySelector('.hint')).toBeNull()
    expect(line().textContent).toContain(session.state.message!.text)
    await hover(control('transport.sync_start'))
    flushSync()
    expect(hintText()).toContain(TIPS['transport.sync_start'].title)
  })

  it('help mode keeps the last entry after the pointer leaves, and says how it works with none', async () => {
    setup()
    tips.toggleHelp()
    flushSync()
    expect(hintText()).toContain('Help mode')
    const accomp = control('transport.acmp')
    await hover(accomp)
    await leave(accomp)
    vi.advanceTimersByTime(CLEAR_MS * 2)
    flushSync()
    expect(hintText()).toContain(TIPS['transport.acmp'].title)
  })

  it('describes the keyboard-focused control to screen readers', async () => {
    setup()
    const accomp = control('transport.acmp')
    vi.spyOn(accomp, 'matches').mockImplementation((sel: string) => sel === ':focus-visible')
    accomp.focus()
    flushSync()
    expect(accomp.getAttribute('aria-describedby')).toBe(TOOLTIP_ID)
    expect(document.getElementById(TOOLTIP_ID)!.textContent).toContain(TIPS['transport.acmp'].body)
    accomp.blur()
    expect(accomp.hasAttribute('aria-describedby')).toBe(false)
  })

  it('Library has its own status line with the hovered control\'s entry', async () => {
    setup()
    ui.openLibrary('sounds', 0)
    flushSync()
    const status = document.querySelector<HTMLElement>('.library-status p[role="status"]')!
    expect(status).toBeTruthy()
    // Library focuses its search field after a tick; take focus away so only the hover counts.
    await tick()
    ;(document.activeElement as HTMLElement | null)?.blur()
    vi.advanceTimersByTime(CLEAR_MS)
    const el = document.querySelector<HTMLElement>('.library-slot [data-tip]')!
    await hover(el)
    flushSync()
    expect(status.querySelector('.hint')!.textContent).toContain(TIPS[el.dataset.tip as TipKey].title)
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
