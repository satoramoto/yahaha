// The app shell (App.svelte): the Stage screen (panels/zen/ZenStageScreen, zen's Svelte Stage) in a
// box that carries the kit's theme, with no help footer; Library in the Stage's place; a display
// page tab showing its page in the Stage's `page` slot until Esc or the Stage tab (and its Alt
// key), and Settings opening the Settings screen; tooltips in the status line; a Stage control
// sending its command; and the former Stage (panels/stage/StageScreen) behind `?legacy`.

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
  ui.rack = false
  ui.settings = false
  ui.soundList = null
  stagePage.page = 'stage'
})

function setup() {
  const session = new MockSession({ demo: true, manual: true })
  render(App, { props: { session } })
  session.advance(16)
  flushSync()
  return session
}

/** The Stage's box (ZenStageScreen). */
const stage = () => document.querySelector<HTMLElement>('.app > main .zen-stage')
/** Library's and Settings' scaled box (they keep the former Stage's scaler). */
const scaler = () => document.querySelector<HTMLElement>('.app > main .scaler[data-theme]')
/** A page tab, on the Stage's app bar (zen's tabs) or on Library's and Settings' (the app's own). */
const tab = (label: string) =>
  [...document.querySelectorAll<HTMLButtonElement>('nav[aria-label="Pages"] button, [role="tablist"][aria-label$="pages"] [role="tab"]')].find(
    (b) => b.textContent?.trim() === label,
  )!
/** The tab is the current page: `aria-selected` on zen's tabs, `aria-current` on the app's. */
const current = (label: string) => {
  const t = tab(label)
  return t.getAttribute('aria-selected') === 'true' || t.getAttribute('aria-current') === 'page'
}
const band = () => document.querySelector('.zen-stage [data-region="mixer"]')
const slot = () => document.querySelector('.zen-stage [data-slot="page"]')

describe('the shell', () => {
  it('mounts zen\'s Stage in a themed box, with no help footer', () => {
    setup()
    const box = stage()
    expect(box).toBeTruthy()
    expect(box!.dataset.theme).toBe(ui.theme)
    expect(box!.querySelector<HTMLElement>('.lib-scope')!.dataset.mode).toBe(ui.resolvedTheme)
    expect(box!.querySelector('.yh-stage')!.getAttribute('data-backdrop')).toBe('transparent')
    expect(document.querySelector('.scaler')).toBeNull()
    expect(band()).toBeTruthy()
    expect(box!.querySelector('[role="tablist"][aria-label="Display pages"]')).toBeTruthy()
    // The column holds the Stage's slot alone.
    const column = [...document.querySelector('.app')!.children]
    expect(column).toHaveLength(1)
    expect(column[0].classList.contains('stage-slot')).toBe(true)
    expect(column[0].contains(box)).toBe(true)
    expect(document.querySelector('footer')).toBeNull()
  })

  it('shows the Library screen in the Stage\'s place while ui.view is library', () => {
    setup()
    ui.openLibrary('sounds', 0)
    flushSync()
    expect(stage()).toBeNull()
    expect(scaler()!.querySelector('section[aria-label="Library: Sounds"]')).toBeTruthy()
    ui.view = 'stage'
    flushSync()
    expect(band()).toBeTruthy()
    expect(document.querySelector('section[aria-label^="Library:"]')).toBeNull()
  })
})

describe('the former Stage (`?legacy`, ui.legacyStage)', () => {
  afterEach(() => {
    ui.legacyStage = false
  })

  it('mounts the former Stage, scaled, in zen\'s Stage\'s place; Accomp toggles', async () => {
    ui.legacyStage = true
    const session = setup()
    expect(stage()).toBeNull()
    const box = scaler()!
    expect(box.querySelector('section[aria-label="Faders"]')).toBeTruthy()
    expect(box.querySelector('nav[aria-label="Pages"]')).toBeTruthy()
    const before = session.state.transport.acmp
    await fireEvent.click(box.querySelector<HTMLButtonElement>('[data-tip="transport.acmp"]')!)
    session.advance(16)
    flushSync()
    expect(session.state.transport.acmp).toBe(!before)
  })
})

describe('page tabs', () => {
  it('Effects shows its page in the page slot, the band and keys stay; Esc comes back to the Stage', async () => {
    setup()
    expect(slot()).toBeNull()
    await fireEvent.click(tab('Effects'))
    flushSync()
    expect(stagePage.page).toBe('effects')
    expect(slot()).toBeTruthy()
    expect(document.querySelector('.yh-stage')!.getAttribute('data-hero')).toBe('page')
    expect(band()).toBeTruthy()
    expect(document.querySelector('.zen-stage [data-region="keys"]')).toBeTruthy()
    expect(current('Effects')).toBe(true)
    await fireEvent.keyDown(window, { key: 'Escape' })
    flushSync()
    expect(stagePage.page).toBe('stage')
    expect(slot()).toBeNull()
    expect(band()).toBeTruthy()
  })

  for (const [key, page, label] of [
    ['e', 'effects', 'Effects'],
    ['l', 'looper', 'Looper'],
    ['p', 'multiPads', 'Multi Pads'],
    ['h', 'harmArp', 'Harm/Arp'],
  ] as const) {
    it(`Alt+${key.toUpperCase()} shows the ${label} page tab, from Library too, and again goes back to the Stage`, async () => {
      setup()
      ui.openLibrary('sounds', 0)
      flushSync()
      const alt = () => fireEvent.keyDown(window, { key, code: `Key${key.toUpperCase()}`, altKey: true })
      await alt()
      flushSync()
      expect(ui.view).toBe('stage')
      expect(stagePage.page).toBe(page)
      expect(current(label)).toBe(true)
      expect(slot()).toBeTruthy()
      // No drawer over it.
      expect(document.querySelector('[role="complementary"]')).toBeNull()
      await alt()
      flushSync()
      expect(stagePage.page).toBe('stage')
      expect(slot()).toBeNull()
    })
  }

  it('a part strip\'s name selects that part and shows the Channel page tab; Multi Pad\'s and Master\'s show theirs', async () => {
    setup()
    const strip = (name: RegExp) => screen.getAllByRole('button', { name })[0]
    await fireEvent.click(strip(/: open Channel$/))
    flushSync()
    expect(stagePage.page).toBe('channel')
    expect(slot()).toBeTruthy()
    await fireEvent.click(strip(/^Multi Pad: open Multi Pads$/))
    flushSync()
    expect(stagePage.page).toBe('multiPads')
    await fireEvent.click(strip(/^Master: open Effects$/))
    flushSync()
    expect(stagePage.page).toBe('effects')
  })

  it('a part strip\'s sound opens that part\'s sound list (launchkey.fader_sound)', async () => {
    setup()
    const sound = screen.getByRole('button', { name: /^Right 2 sound: .+, choose a sound$/ })
    expect(sound.dataset.tip).toBe('launchkey.fader_sound')
    await fireEvent.click(sound)
    flushSync()
    expect(ui.soundList?.part).toBe('right2')
    expect(stagePage.page).toBe('stage')
  })

  it('Library, a full tab, shows the Library screen; the Stage tab and Esc come back', async () => {
    setup()
    await fireEvent.click(tab('Library'))
    flushSync()
    expect(ui.view).toBe('library')
    expect(screen.queryByText('Coming soon')).toBeNull()
    expect(document.querySelector('section[aria-label^="Library:"]')).toBeTruthy()
    expect(current('Library')).toBe(true)
    await fireEvent.click(tab('Stage'))
    flushSync()
    expect(ui.view).toBe('stage')
    expect(stagePage.page).toBe('stage')
    expect(band()).toBeTruthy()
    await fireEvent.click(tab('Library'))
    flushSync()
    await fireEvent.keyDown(window, { key: 'Escape' })
    flushSync()
    expect(ui.view).toBe('stage')
  })

  it('the Settings tab shows the Settings screen in the Stage\'s place, and a setting round-trips', async () => {
    const session = setup()
    session.send({ type: 'setUpper', on: false })
    session.advance(16)
    await fireEvent.click(tab('Settings'))
    flushSync()
    expect(ui.settings).toBe(true)
    expect(screen.queryByText('Coming soon')).toBeNull()
    expect(current('Settings')).toBe(true)
    // The screen, not the old drawer, and not the Stage under it.
    expect(scaler()!.querySelector('nav[aria-label="Settings pages"]')).toBeTruthy()
    expect(document.querySelector('[role="complementary"]')).toBeNull()
    expect(stage()).toBeNull()
    // Chord & Split's Upper: the change reaches the session and comes back.
    await fireEvent.click(scaler()!.querySelector<HTMLElement>('[data-tip="detection.upper"]')!)
    session.advance(16)
    flushSync()
    expect(session.state.chord.upper).toBe(true)
    expect(scaler()!.querySelector('[data-tip="detection.upper"]')!.getAttribute('aria-pressed')).toBe('true')
    // The Stage tab leaves it.
    await fireEvent.click(tab('Stage'))
    flushSync()
    expect(ui.settings).toBe(false)
    expect(stagePage.page).toBe('stage')
    expect(document.querySelector('nav[aria-label="Settings pages"]')).toBeNull()
    expect(band()).toBeTruthy()
  })

  it('Alt+T shows the same Settings screen, with its tab current; Esc leaves it', async () => {
    setup()
    await fireEvent.keyDown(window, { key: 't', code: 'KeyT', altKey: true })
    flushSync()
    expect(ui.settings).toBe(true)
    expect(document.querySelector('nav[aria-label="Settings pages"]')).toBeTruthy()
    expect(document.querySelector('[role="complementary"]')).toBeNull()
    expect(current('Settings')).toBe(true)
    await fireEvent.keyDown(window, { key: 'Escape' })
    flushSync()
    expect(ui.settings).toBe(false)
    expect(document.querySelector('nav[aria-label="Settings pages"]')).toBeNull()
  })

  it('Esc closes a drawer open over the Stage before it leaves a page', async () => {
    setup()
    await fireEvent.click(tab('Looper'))
    ui.rack = true
    flushSync()
    await fireEvent.keyDown(window, { key: 'Escape' })
    expect(ui.rack).toBe(false)
    expect(stagePage.page).toBe('looper')
    await fireEvent.keyDown(window, { key: 'Escape' })
    expect(stagePage.page).toBe('stage')
  })
})

describe('the side panel', () => {
  it('help mode shows the help card in the side slot', () => {
    setup()
    expect(document.querySelector('.zen-stage [data-slot="side"]')).toBeNull()
    tips.help = true
    flushSync()
    expect(document.querySelector('.zen-stage [data-slot="side"]')).toBeTruthy()
    expect(document.querySelector('.yh-stage')!.getAttribute('data-hero')).toMatch(/^side/)
    tips.help = false
    flushSync()
    expect(document.querySelector('.zen-stage [data-slot="side"]')).toBeNull()
  })
})

describe('the metronome popover and the global keys', () => {
  const toggle = () => document.querySelector<HTMLElement>('.zen-stage [aria-controls][aria-haspopup], .zen-stage [aria-controls][aria-expanded]')!
  const popover = () => {
    const id = toggle().getAttribute('aria-controls')!
    return document.getElementById(id)
  }
  const openPopover = async () => {
    await fireEvent.click(toggle())
    flushSync()
    expect(popover()).toBeTruthy()
  }

  it('Esc in the popover closes only the popover, not the open page', async () => {
    setup()
    await fireEvent.click(tab('Looper'))
    await openPopover()
    // One Esc, pressed in the popover (it bubbles to the window's keys).
    await fireEvent.keyDown(popover()!.querySelector<HTMLElement>('[role="slider"]')!, { key: 'Escape' })
    flushSync()
    expect(popover()).toBeNull()
    expect(stagePage.page).toBe('looper')
  })

  it('the volume slider\'s keys stay in the popover', async () => {
    const session = setup()
    await openPopover()
    const send = vi.spyOn(session, 'send')
    const slider = popover()!.querySelector<HTMLElement>('[role="slider"]')!
    for (const key of ['ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown']) await fireEvent.keyDown(slider, { key })
    const types = send.mock.calls.map(([c]) => c.type)
    expect(types).not.toContain('stepStyle')
    expect(types).not.toContain('cyclePadPage')
  })
})

describe('tooltips in the status line', () => {
  const line = () => document.querySelector<HTMLElement>('.zen-stage [role="status"].yh-status-line')!
  const hintText = () => line().querySelector('[data-part="hint"]')?.textContent ?? ''
  const control = (key: string) => document.querySelector<HTMLElement>(`.zen-stage [data-tip="${key}"]`)!
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
    expect(line().querySelector('[data-part="hint"]')!.getAttribute('aria-hidden')).toBe('true')
    // The message stays in the live region, under the hint.
    expect(line().querySelector('.yh-status-line-under')!.textContent).toContain(message)

    await leave(accomp)
    vi.advanceTimersByTime(CLEAR_MS)
    flushSync()
    expect(line().querySelector('[data-part="hint"]')).toBeNull()
    expect(line().querySelector('.yh-status-line-button:not(.yh-status-line-under)')!.textContent).toContain(message)
  })

  it('an error that arrives during a hover shows; the next control shows its entry again', async () => {
    const session = setup()
    await hover(control('transport.acmp'))
    flushSync()
    expect(hintText()).toContain(TIPS['transport.acmp'].title)
    session.send({ type: 'auditionStyle', id: 1 })
    session.advance(16)
    flushSync()
    expect(line().querySelector('[data-part="hint"]')).toBeNull()
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

  it('Library\'s status line shows the hovered control\'s entry', async () => {
    setup()
    ui.openLibrary('sounds', 0)
    flushSync()
    const status = document.querySelector<HTMLElement>('.scaler p[role="status"]')!
    expect(status).toBeTruthy()
    await tick()
    ;(document.activeElement as HTMLElement | null)?.blur()
    vi.advanceTimersByTime(CLEAR_MS)
    const el = document.querySelector<HTMLElement>('section[aria-label="Library: Sounds"] [data-tip]')!
    await hover(el)
    flushSync()
    expect(status.querySelector('.hint')!.textContent).toContain(TIPS[el.dataset.tip as TipKey].title)
  })
})

describe('the Stage\'s controls', () => {
  it('Accomp toggles the session\'s accompaniment', async () => {
    const session = setup()
    const before = session.state.transport.acmp
    const accomp = document.querySelector<HTMLButtonElement>('.zen-stage [data-tip="transport.acmp"]')!
    expect(accomp.getAttribute('aria-pressed')).toBe(String(before))
    await fireEvent.click(accomp)
    session.advance(16)
    flushSync()
    expect(session.state.transport.acmp).toBe(!before)
    expect(accomp.getAttribute('aria-pressed')).toBe(String(!before))
  })
})
