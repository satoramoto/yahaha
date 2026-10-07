// LooperPage on a MockSession: the page draws the session's Chord Looper, and its controls drive it.

import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte'
import { flushSync } from 'svelte'
import type { Action } from 'svelte/action'
import { afterEach, describe, expect, it } from 'vitest'
import { isTipKey } from '../../help/tooltips'
import { MockSession } from '../../lib/api/mock'
import { app } from '../../lib/store.svelte'
import { tip } from '../../lib/tooltip/tip.svelte'
import LooperPage from './LooperPage.svelte'

function setup() {
  const session = new MockSession({ manual: true, demo: true })
  app.attach(session)
  flushSync()
  render(LooperPage, { tipAction: tip as unknown as Action<HTMLElement, string> })
  return session
}

afterEach(() => {
  cleanup()
  app.detach()
})

const button = (name: string | RegExp) => screen.getByRole('button', { name })
const barMs = (s: MockSession) => (60000 / s.state.transport.tempo) * s.state.transport.beatsPerBar

describe('Looper page', () => {
  it('records while the band plays, loops from the next bar, stores a memory and stops', async () => {
    const s = setup()
    expect(s.state.transport.running).toBe(true)
    await fireEvent.click(button('Rec / Stop'))
    expect(s.state.looper.mode).toBe('recArmed')
    flushSync()
    expect(button('Rec / Stop').getAttribute('aria-pressed')).toBe('true')
    // Recording starts on the next bar line.
    for (let ms = 0; s.state.looper.mode === 'recArmed' && ms < 2 * barMs(s); ms += 20) s.advance(20)
    expect(s.state.looper.mode).toBe('recording')
    s.advance(4 * barMs(s) - 200)
    await fireEvent.click(button('On / Off'))
    expect(s.state.looper.mode).toBe('loopArmed')
    s.advance(400)
    flushSync()
    expect(s.state.looper.mode).toBe('looping')
    expect(s.state.looper.bars).toBe(4)
    expect(s.state.looper.chords.length).toBeGreaterThan(0)
    const lane = screen.getByRole('list', { name: /The loop/ })
    expect(within(lane).getAllByRole('listitem')).toHaveLength(8)
    expect(within(lane).getByRole('listitem', { current: true }).getAttribute('aria-label')).toMatch(/^Bar 1:/)
    expect(screen.getByText(/Loop · 4 bars/)).toBeTruthy()

    await fireEvent.click(button(/^Memory: store/))
    flushSync()
    expect(button(/^Memory: store/).getAttribute('aria-pressed')).toBe('true')
    await fireEvent.click(button(/^Store in memory 3:/))
    flushSync()
    expect(s.state.looper.memories[2].name).toBe('CLD_001')
    expect(s.state.looper.memory).toBe(2)
    expect(button(/^Memory 3: CLD_001/).getAttribute('aria-pressed')).toBe('true')

    await fireEvent.click(button('On / Off'))
    expect(s.state.looper.mode).toBe('off')
    expect(s.state.looper.hasData).toBe(true)
  })

  it('clears a memory, starts a new bank, and saves the bank under a typed name', async () => {
    const s = setup()
    s.state.looper.memories[0] = { name: 'CLD_009', bars: 1, chords: [{ bar: 1, beat: 1, chord: 'C' }] }
    await fireEvent.click(button('Clear a memory'))
    await fireEvent.click(button(/^Clear memory 1:/))
    expect(s.state.looper.memories[0].name).toBeNull()

    await fireEvent.click(button('Save the bank as'))
    flushSync()
    const field = screen.getByRole('textbox', { name: 'Bank name' })
    await fireEvent.input(field, { target: { value: 'Gig' } })
    await fireEvent.click(button('Save the bank'))
    flushSync()
    expect(s.state.looper.bankName).toBe('Gig')
    expect(s.state.looper.bankPath).not.toBeNull()
    expect(screen.queryByRole('textbox', { name: 'Bank name' })).toBeNull()

    await fireEvent.click(button('New bank'))
    flushSync()
    expect(s.state.looper.bankPath).toBeNull()
    expect(screen.getByText('not saved to a file')).toBeTruthy()

    await fireEvent.click(button('Load a bank'))
    flushSync()
    const menu = screen.getByRole('menu', { name: 'Bank files' })
    await fireEvent.click(within(menu).getByRole('menuitem', { name: 'Gig' }))
    flushSync()
    expect(s.state.looper.bankName).toBe('Gig')
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('a stopped 12-bar loop pages to bars 9–16; while looping the lane follows the playing bar', async () => {
    const s = setup()
    await recordLoop(s, 12)
    expect(s.state.looper.mode).toBe('looping')
    expect(s.state.looper.bars).toBe(12)
    flushSync()
    const lane = () => screen.getByRole('list', { name: /The loop/ })
    const firstBar = () => within(lane()).getAllByRole('listitem')[0].getAttribute('aria-label')
    expect(firstBar()).toMatch(/^Bar 1:/)
    // Looping: the window holds the playing bar, ◀ ▶ rest.
    expect(button('Later bars').getAttribute('aria-disabled')).toBe('true')
    for (let ms = 0; s.state.looper.bar !== 10 && ms < 12 * barMs(s); ms += 20) s.advance(20)
    flushSync()
    expect(firstBar()).toMatch(/^Bar 9:/)
    expect(within(lane()).getByRole('listitem', { current: true }).getAttribute('aria-label')).toMatch(/^Bar 10:/)

    // Stopped: back to bars 1–8, paged by hand.
    await fireEvent.click(button('On / Off'))
    flushSync()
    expect(s.state.looper.mode).toBe('off')
    expect(firstBar()).toMatch(/^Bar 1:/)
    expect(button('Earlier bars').getAttribute('aria-disabled')).toBe('true')
    await fireEvent.click(button('Later bars'))
    flushSync()
    const items = within(lane()).getAllByRole('listitem')
    expect(items.map((e) => e.getAttribute('aria-label')?.split(':')[0])).toEqual([9, 10, 11, 12, 13, 14, 15, 16].map((n) => `Bar ${n}`))
    expect(items[4].getAttribute('aria-label')).toBe('Bar 13: empty')
    expect(screen.getByText(/bars 9–12 of 12/)).toBeTruthy()
    expect(button('Later bars').getAttribute('aria-disabled')).toBe('true')
    await fireEvent.click(button('Earlier bars'))
    flushSync()
    expect(firstBar()).toMatch(/^Bar 1:/)
  })

  it('every control has a tooltip: a paged long loop, Save as… (and Overwrite), the Load list', async () => {
    const s = setup()
    const untipped = () =>
      [...document.querySelectorAll('button, input, [role="slider"], [tabindex]:not([tabindex="-1"])')].filter(
        (e) => !isTipKey(e.getAttribute('data-tip') ?? ''),
      )
    await recordLoop(s, 12)
    await fireEvent.click(button('On / Off'))
    flushSync()
    await fireEvent.click(button('Later bars'))
    flushSync()
    expect(screen.getByText(/bars 9–12 of 12/)).toBeTruthy()
    expect(untipped()).toEqual([])

    // Save as…: the name field, Save and Cancel; then save a bank so the Load list has one.
    await fireEvent.click(button('Save the bank as'))
    flushSync()
    expect(screen.getByRole('textbox', { name: 'Bank name' })).toBeTruthy()
    expect(button('Cancel saving')).toBeTruthy()
    expect(untipped()).toEqual([])
    await fireEvent.input(screen.getByRole('textbox', { name: 'Bank name' }), { target: { value: 'Gig' } })
    await fireEvent.click(button('Save the bank'))
    await fireEvent.click(button('New bank'))
    flushSync()

    // A name another bank has: Overwrite.
    await fireEvent.click(button('Save the bank as'))
    flushSync()
    await fireEvent.input(screen.getByRole('textbox', { name: 'Bank name' }), { target: { value: 'Gig' } })
    flushSync()
    expect(button('Overwrite')).toBeTruthy()
    expect(untipped()).toEqual([])
    await fireEvent.click(button('Cancel saving'))
    flushSync()

    await fireEvent.click(button('Load a bank'))
    flushSync()
    const menu = screen.getByRole('menu', { name: 'Bank files' })
    expect(within(menu).getAllByRole('menuitem').length).toBeGreaterThan(0)
    expect(untipped()).toEqual([])
  })
})

/** Records a loop of `bars` bars on the mock while the band plays, and loops it. */
async function recordLoop(s: MockSession, bars: number) {
  await fireEvent.click(button('Rec / Stop'))
  for (let ms = 0; s.state.looper.mode === 'recArmed' && ms < 2 * barMs(s); ms += 20) s.advance(20)
  s.advance(bars * barMs(s) - 200)
  await fireEvent.click(button('On / Off'))
  s.advance(400)
  flushSync()
}
