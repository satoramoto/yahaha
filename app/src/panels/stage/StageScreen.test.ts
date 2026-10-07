// StageScreen on a MockSession: the Stage draws the session's state, and its controls change it.

import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte'
import { flushSync } from 'svelte'
import { afterEach, describe, expect, it } from 'vitest'
import { MockSession } from '../../lib/api/mock'
import { app } from '../../lib/store.svelte'
import { stagePage } from './page.svelte'
import StageScreen from './StageScreen.svelte'

function setup() {
  const session = new MockSession({ demo: true, manual: true })
  session.advance(16)
  app.attach(session)
  flushSync()
  render(StageScreen)
  return session
}

afterEach(() => {
  cleanup()
  app.detach()
  stagePage.page = 'stage'
})

const region = (name: string) => screen.getByRole('region', { name })
const toolbar = () => screen.getByRole('toolbar', { name: 'Transport, switches and helpers' })
const button = (name: string | RegExp, within_: HTMLElement = document.body) => within(within_).getByRole('button', { name })

describe('StageScreen', () => {
  it('shows the session: style name, tempo, the parts\' sounds', () => {
    const s = setup()
    const text = document.body.textContent ?? ''
    expect(s.state.style.name).toBe('Sunday Drive Pop')
    expect(text).toContain('Sunday Drive Pop')
    expect(text).toContain(String(Math.round(s.state.transport.tempo)))
    for (const p of s.state.keyboardParts) expect(text).toContain(p.sound?.name ?? p.voiceName)
  })

  it('Accomp toggles the accompaniment', async () => {
    const s = setup()
    const before = s.state.transport.acmp
    await fireEvent.click(button('Accomp (ACMP)', toolbar()))
    expect(s.state.transport.acmp).toBe(!before)
  })

  it('Sync Start arms and disarms', async () => {
    const s = setup()
    const before = s.state.transport.syncStart
    await fireEvent.click(button('Sync Start', toolbar()))
    expect(s.state.transport.syncStart).toBe(!before)
  })

  it('Fill ▲ queues a fill', async () => {
    const s = setup()
    const before = [s.state.transport.queued, s.state.transport.landing]
    await fireEvent.click(button(/^Fill Up:/, toolbar()))
    expect([s.state.transport.queued, s.state.transport.landing]).not.toEqual(before)
  })

  it('a knob page tab chooses the knob page', async () => {
    const s = setup()
    const tabs = within(region('Knobs')).getByRole('tablist')
    await fireEvent.click(within(tabs).getByRole('tab', { name: 'Reverb' }))
    expect(s.state.knobs.page).toBe('reverb')
  })

  it('a pad bank tab chooses the pad page', async () => {
    const s = setup()
    const tabs = within(region('Pads')).getByRole('tablist')
    const second = s.state.pads.pages[1]
    await fireEvent.click(within(tabs).getByRole('tab', { name: second.name }))
    expect(s.state.pads.page).toBe(second.page)
  })

  it('a fader layer tab changes the layer', async () => {
    const s = setup()
    const layers = within(region('Faders')).getByRole('tablist', { name: 'Fader layer' })
    await fireEvent.click(within(layers).getByRole('tab', { name: 'Pan' }))
    expect(s.state.mixer.faderLayer).toBe('pan')
  })

  it('a part lamp toggles its part', async () => {
    const s = setup()
    expect(s.state.keyboardParts[2].on).toBe(false)
    await fireEvent.click(button(/^Right 3 off\./, region('Faders')))
    expect(s.state.keyboardParts[2].on).toBe(true)
  })

  it('a section pad sends its action', async () => {
    const s = setup()
    expect(s.state.transport.section).toBe('Main B')
    const before = [s.state.transport.queued, s.state.transport.landing]
    await fireEvent.click(button(/^Main\sC \(pad 11\)$/, region('Pads')))
    expect([s.state.transport.queued, s.state.transport.landing]).not.toEqual(before)
    expect(s.state.transport.main === 2 || s.state.transport.landing === 'Main C' || s.state.transport.queued === 'Main C').toBe(true)
  })

  it('Start / Stop stops the band', async () => {
    const s = setup()
    expect(s.state.transport.running).toBe(true)
    await fireEvent.click(button(/^Playing: Start \/ Stop \(Play\)/, toolbar()))
    expect(s.state.transport.running).toBe(false)
  })

  it('a fader shows the part\'s level after a Quick Rack recall', async () => {
    const s = setup()
    s.send({ type: 'setPartVolume', part: 0, volume: 40 })
    s.send({ type: 'storeRack', slot: 0 })
    s.send({ type: 'setPartVolume', part: 0, volume: 120 })
    flushSync()
    expect(button(/^Right 1 120/, region('Faders'))).toBeTruthy()
    s.send({ type: 'pressQuickRack', slot: 0, discard: true })
    flushSync()
    expect(s.state.keyboardParts[0].volume).toBe(40)
    expect(button(/^Right 1 40/, region('Faders'))).toBeTruthy()
  })

  it('ArrowUp on a fader sets the part\'s volume one higher, and the fader shows it', async () => {
    const s = setup()
    const before = s.state.keyboardParts[0].volume
    await fireEvent.keyDown(button(new RegExp(`^Right 1 ${before}`), region('Faders')), { key: 'ArrowUp' })
    expect(s.state.keyboardParts[0].volume).toBe(before + 1)
    expect(button(new RegExp(`^Right 1 ${before + 1}`), region('Faders'))).toBeTruthy()
  })

  it('dragging a knob turns it from where it is, a step every 4px', async () => {
    const s = setup()
    const knob = button(/^Knob 6: Swing/, region('Knobs'))
    const before = s.state.styleSettings.swing
    await fireEvent.pointerDown(knob, { pointerId: 1, button: 0, clientX: 0, clientY: 500 })
    expect(s.state.styleSettings.swing).toBe(before)
    await fireEvent.pointerMove(knob, { pointerId: 1, clientX: 0, clientY: 492 })
    await fireEvent.pointerUp(knob, { pointerId: 1 })
    expect(s.state.styleSettings.swing).toBeGreaterThan(before)
    // Two steps, as two ↑ presses would be: two ↓ bring it back.
    await fireEvent.keyDown(knob, { key: 'ArrowDown' })
    await fireEvent.keyDown(knob, { key: 'ArrowDown' })
    expect(s.state.styleSettings.swing).toBe(before)
  })

  it('ArrowUp on a knob turns it one step', async () => {
    const s = setup()
    expect(s.state.styleSettings.swing).toBe(0)
    await fireEvent.keyDown(button(/^Knob 6: Swing/, region('Knobs')), { key: 'ArrowUp' })
    expect(s.state.styleSettings.swing).toBeGreaterThan(0)
  })

  it('Tempo + from the keyboard steps the tempo up once', async () => {
    const s = setup()
    const before = s.state.transport.tempo
    // Enter on a button fires a click with no pointer detail (jsdom doesn't synthesise it).
    await fireEvent.click(button('Tempo up (Scene Launch)'), { detail: 0 })
    expect(s.state.transport.tempo).toBe(before + 1)
  })

  it('the tempo number: ↑ sets one higher, dragging up sets more, a double-click goes back to the style\'s', async () => {
    const s = setup()
    const tempo = within(region('Stage display')).getByRole('spinbutton')
    const before = Math.round(s.state.transport.tempo)
    await fireEvent.keyDown(tempo, { key: 'ArrowUp' })
    expect(s.state.transport.tempo).toBe(before + 1)
    await fireEvent.pointerDown(tempo, { pointerId: 1, button: 0, clientY: 400 })
    await fireEvent.pointerMove(tempo, { pointerId: 1, clientY: 380 })
    await fireEvent.pointerUp(tempo, { pointerId: 1 })
    expect(s.state.transport.tempo).toBe(before + 1 + 5)
    await fireEvent.dblClick(tempo)
    expect(s.state.transport.tempo).toBe(s.state.style.tempo)
  })

  it('One Touch on the display applies it', async () => {
    const s = setup()
    await fireEvent.click(button(/^Apply One Touch 1/, region('Stage display')))
    expect(s.state.ots.applied).toBe(1)
  })

  it('every interactive element carries a data-tip', () => {
    setup()
    const interactive = [...document.querySelectorAll<HTMLElement>('button, input, select, textarea, [role="slider"], [role="tab"], [tabindex]:not([tabindex="-1"])')]
    expect(interactive.length).toBeGreaterThan(50)
    const missing = interactive.filter((el) => !el.closest('[data-tip]')).map((el) => el.getAttribute('aria-label') ?? el.textContent)
    expect(missing).toEqual([])
  })

  it('each display page tab shows its page in the display box, the band stays; the Stage tab comes back', async () => {
    setup()
    const slot = () => document.querySelector<HTMLElement>('[data-slot="page"]')
    const tabButton = (label: string) => within(screen.getByRole('navigation', { name: 'Pages' })).getByRole('button', { name: label })
    for (const label of ['Channel', 'Effects', 'Quick Racks', 'Multi Pads', 'Looper', 'Harm/Arp']) {
      await fireEvent.click(tabButton(label))
      expect(slot(), label).toBeTruthy()
      expect(slot()!.childElementCount, `${label}: the page rendered nothing`).toBeGreaterThan(0)
      expect(region('Faders')).toBeTruthy()
    }
    await fireEvent.click(tabButton('Stage'))
    expect(slot()).toBeNull()
    expect(region('Faders')).toBeTruthy()
  })

  it('the scaler carries the theme', () => {
    setup()
    const scaler = document.querySelector('.scaler')!
    expect(['dark', 'light']).toContain(scaler.getAttribute('data-theme'))
  })
})
