import { render, cleanup, screen, fireEvent } from '@testing-library/svelte'
import { flushSync } from 'svelte'
import { afterEach, describe, expect, it } from 'vitest'
import { MockSession } from './api/mock'
import DropoutNotice from './DropoutNotice.svelte'
import { DropoutWatch, HINT_COUNT, HINT_WINDOW_MS, SNOOZE_MS, dropouts } from './dropouts.svelte'
import { nav } from '../panels/settings/nav.svelte'
import { app, ui } from './store.svelte'

const at = (n: number, buffer: number | null = 64) => ({ dropouts: n, bufferFrames: buffer })

describe('the dropout hint', () => {
  it('ignores a single blip and speaks up when dropouts keep coming', () => {
    const w = new DropoutWatch()
    w.observe(at(0), 0)
    w.observe(at(1), 1000)
    expect(w.show).toBe(false)
    w.observe(at(2), 2000)
    expect(w.show).toBe(false)
    w.observe(at(3), 3000)
    expect(w.show).toBe(true)
  })

  it('forgets dropouts older than its window', () => {
    const w = new DropoutWatch()
    w.observe(at(0), 0)
    w.observe(at(2), 0)
    w.observe(at(3), HINT_WINDOW_MS + 1)
    expect(w.show).toBe(false)
  })

  it('counts from the first sight: dropouts before the app attached do not count', () => {
    const w = new DropoutWatch()
    w.observe(at(40), 0)
    expect(w.show).toBe(false)
  })

  it('stays away once dismissed, then may come back', () => {
    const w = new DropoutWatch()
    w.observe(at(0), 0)
    w.observe(at(5), 1000)
    expect(w.show).toBe(true)
    w.dismiss(1000)
    expect(w.show).toBe(false)
    w.observe(at(10), 5000)
    expect(w.show, 'not every few seconds').toBe(false)
    w.observe(at(15), 1000 + SNOOZE_MS + 1)
    expect(w.show).toBe(true)
  })

  it('a new buffer size clears it and starts the count again', () => {
    const w = new DropoutWatch()
    w.observe(at(0), 0)
    w.observe(at(5), 1000)
    expect(w.show).toBe(true)
    w.observe(at(5, 256), 2000)
    expect(w.show).toBe(false)
    w.observe(at(6, 256), 3000)
    expect(w.show).toBe(false)
  })

  it('has nothing to suggest at the largest buffer, or without the synth', () => {
    const w = new DropoutWatch()
    w.observe(at(0, 1024), 0)
    w.observe(at(9, 1024), 1000)
    expect(w.show).toBe(false)
    w.observe(null, 2000)
    expect(w.show).toBe(false)
  })
})

describe('recent dropouts (the Stage\'s health slot)', () => {
  it('counts the dropouts of the last 30 s, up to HINT_COUNT, and 0 once they age out', () => {
    const w = new DropoutWatch()
    w.observe(at(0), 0)
    expect(w.recent(0)).toBe(0)
    w.observe(at(1), 1000)
    expect(w.recent(1000)).toBe(1)
    w.observe(at(2), 5000)
    expect(w.recent(5000)).toBe(2)
    w.observe(at(3), 6000)
    expect(w.recent(6000)).toBe(3)
    // Without a new observation: each ages out HINT_WINDOW_MS after it was seen.
    expect(w.recent(1000 + HINT_WINDOW_MS)).toBe(3)
    expect(w.recent(5000 + HINT_WINDOW_MS + 1)).toBe(1)
    expect(w.recent(6000 + HINT_WINDOW_MS + 1)).toBe(0)
    // A burst counts as at most HINT_COUNT.
    w.observe(at(50), 7000)
    expect(w.recent(7000)).toBe(HINT_COUNT)
  })

  it('ignores the snooze, and starts again with a new buffer size or no synth', () => {
    const w = new DropoutWatch()
    w.observe(at(0), 0)
    w.observe(at(5), 1000)
    w.dismiss(1000)
    w.observe(at(7), 2000)
    expect(w.show).toBe(false)
    expect(w.recent(2000)).toBe(2)
    w.observe(at(7, 256), 3000)
    expect(w.recent(3000)).toBe(0)
    w.observe(at(9, 256), 4000)
    expect(w.recent(4000)).toBe(2)
    w.observe(null, 5000)
    expect(w.recent(5000)).toBe(0)
  })
})

// DropoutNotice is no longer mounted by the shell (the Stage's health slot shows dropouts),
// but it still works on its own: rendered with the store attached to a session.
describe('the dropout notice', () => {
  afterEach(() => {
    cleanup()
    app.detach()
    ui.settings = false
    nav.tab = 'chord'
    dropouts.reset()
  })

  function setup() {
    const session = new MockSession({ demo: true, manual: true })
    app.attach(session)
    render(DropoutNotice)
    session.advance(16)
    flushSync()
    return session
  }

  it('appears when the engine reports dropouts, opens Settings › Audio, and dismisses', () => {
    const session = setup()
    expect(screen.queryByRole('alert')).toBeNull()
    session.dropouts(4)
    flushSync()
    expect(screen.getByRole('alert').textContent).toContain('consider increasing the buffer size')
    fireEvent.click(screen.getByText('Buffer size…'))
    flushSync()
    expect(ui.settings).toBe(true)
    expect(nav.tab).toBe('audio')
    fireEvent.click(screen.getByLabelText('Dismiss'))
    flushSync()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('goes away when a larger buffer is chosen', () => {
    const session = setup()
    session.dropouts(4)
    flushSync()
    expect(screen.getByRole('alert')).toBeTruthy()
    session.send({ type: 'setAudioBuffer', frames: 256 })
    flushSync()
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
