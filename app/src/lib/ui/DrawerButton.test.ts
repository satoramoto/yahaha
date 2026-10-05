// DrawerButton, the small secondary button that opens a drawer: it shows whether its drawer
// is open, calls back on a click and carries its tooltip. And the old stage panels that hold
// one (mixer bar, master strip, Launchkey mirror, lead sheet, key strip), each rendered on its
// own now that the shell mounts the Stage instead: each button opens its drawer and closes it
// again. The old Header keeps only the app's own controls.

import { cleanup, fireEvent, render } from '@testing-library/svelte'
import { createRawSnippet, flushSync, type Component } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MockSession } from '../api/mock'
import { app, ui } from '../store.svelte'
import Header from '../../panels/header/Header.svelte'
import KeyStrip from '../../panels/keystrip/KeyStrip.svelte'
import Launchkey from '../../panels/launchkey/Launchkey.svelte'
import LeadSheet from '../../panels/leadsheet/LeadSheet.svelte'
import MasterStrip from '../../panels/mixer/MasterStrip.svelte'
import MixerBar from '../../panels/mixer/MixerBar.svelte'
import DrawerButton from './DrawerButton.svelte'

afterEach(() => {
  cleanup()
  app.detach()
  ui.rack = ui.mixer = ui.effects = ui.multipad = ui.charts = ui.harmony = ui.looper = ui.settings = false
  ui.browser = false
  ui.view = 'stage'
  ui.libraryTab = 'sounds'
  ui.libraryPart = 0
})

function attach() {
  const session = new MockSession({ demo: true, manual: true })
  app.attach(session)
  session.advance(16)
  flushSync()
  return session
}

const btn = (sel: string) => document.querySelector<HTMLButtonElement>(sel)!
const face = createRawSnippet(() => ({ render: () => '<span>Rack</span>' }))

describe('DrawerButton', () => {
  it('shows its drawer open or closed, carries its tooltip and calls back on a click', async () => {
    const onclick = vi.fn()
    const { rerender } = render(DrawerButton, { props: { tip: 'drawer.rack', open: false, onclick, children: face } })
    const b = btn('button.drawer-btn')
    expect(b.textContent).toBe('Rack')
    expect(b.getAttribute('data-tip')).toBe('drawer.rack')
    expect(b.getAttribute('aria-pressed')).toBe('false')
    expect(b.classList.contains('open')).toBe(false)
    await fireEvent.click(b)
    expect(onclick).toHaveBeenCalledTimes(1)
    await rerender({ tip: 'drawer.rack', open: true, onclick, children: face })
    expect(b.getAttribute('aria-pressed')).toBe('true')
    expect(b.classList.contains('open')).toBe(true)
  })

  it('takes an accessible name for an abbreviated face', () => {
    render(DrawerButton, { props: { tip: 'drawer.rack', open: false, onclick: () => {}, children: face, label: 'Rack drawer' } })
    expect(btn('button.drawer-btn').getAttribute('aria-label')).toBe('Rack drawer')
  })
})

describe('drawer buttons on the old stage panels', () => {
  const PLACES = [
    ['drawer.mixer', 'mixer', MasterStrip, '.master'],
    ['drawer.mixer', 'mixer', MixerBar, '.bar[aria-label="Mixer"]'],
    ['drawer.rack', 'rack', MixerBar, '.bar[aria-label="Mixer"]'],
    ['drawer.multipad', 'multipad', Launchkey, '.pagebar'],
    ['drawer.charts', 'charts', LeadSheet, 'section[aria-label="Lead sheet"]'],
    ['drawer.harmony', 'harmony', KeyStrip, 'section[aria-label="Keyboard"]'],
    ['drawer.looper', 'looper', KeyStrip, 'section[aria-label="Keyboard"]'],
  ] as const

  for (const [tip, drawer, panel, place] of PLACES) {
    it(`${tip} sits in ${place} and toggles its drawer`, async () => {
      attach()
      render(panel as unknown as Component)
      flushSync()
      const b = btn(`${place} .drawer-btn[data-tip="${tip}"]`)
      expect(b).toBeTruthy()
      expect(b.getAttribute('aria-pressed')).toBe('false')
      await fireEvent.click(b)
      flushSync()
      expect(ui[drawer]).toBe(true)
      expect(b.getAttribute('aria-pressed')).toBe('true')
      await fireEvent.click(b)
      flushSync()
      expect(ui[drawer]).toBe(false)
    })
  }

  it('drawer.library on the mixer bar opens Library on Sounds, loading into the selected part', async () => {
    const session = attach()
    session.send({ type: 'selectPart', part: 2 })
    session.advance(16)
    render(MixerBar)
    flushSync()
    await fireEvent.click(btn('.bar[aria-label="Mixer"] .drawer-btn[data-tip="drawer.library"]'))
    flushSync()
    expect(ui.view).toBe('library')
    expect(ui.libraryTab).toBe('sounds')
    expect(ui.libraryPart).toBe(2)
  })

  it('the old Header keeps Settings, help and theme, and no drawer buttons', () => {
    attach()
    render(Header)
    flushSync()
    const bar = document.querySelector('header.bar')!
    expect(bar.querySelector('[data-tip="settings.open"]')).toBeTruthy()
    expect(bar.querySelector('[data-tip="app.help"]')).toBeTruthy()
    expect(bar.querySelector('[data-tip^="drawer."], [data-tip="browser.open"]')).toBeNull()
  })
})
