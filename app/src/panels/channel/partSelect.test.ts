// A hardware part select opens Channel (Channel.md CH-D15, interim CH-C2): a part's `selected`
// turning on, after the first snapshot.

import { flushSync } from 'svelte'
import { afterEach, describe, expect, it } from 'vitest'
import { emptyState } from '../../lib/api/constants'
import type { AppState } from '../../lib/api/types'
import { app, ui } from '../../lib/store.svelte'
import { PartSelectWatch, watchPartSelect } from './partSelect.svelte'

describe('PartSelectWatch.observe', () => {
  it('the first call is the baseline; a part turning selected is returned once', () => {
    const w = new PartSelectWatch()
    expect(w.observe([true, false, false, false])).toBeNull()
    expect(w.observe([true, false, false, false])).toBeNull()
    expect(w.observe([false, false, true, false])).toBe(2)
    expect(w.observe([false, false, true, false])).toBeNull()
  })

  it('a part already selected and staying selected opens nothing; the first new one wins', () => {
    const w = new PartSelectWatch()
    expect(w.observe([false, true, false, false])).toBeNull()
    expect(w.observe([false, true, false, false])).toBeNull()
    expect(w.observe([true, true, false, true])).toBe(0)
  })
})

describe('watchPartSelect', () => {
  const select = (part: number) => {
    const s: AppState = { ...app.state, keyboardParts: app.state.keyboardParts.map((p, i) => ({ ...p, selected: i === part })) }
    app.state = s
    flushSync()
  }

  afterEach(() => {
    app.state = emptyState()
    ui.selectedPart = 0
  })

  it('opens the part a hardware select chooses, not the one already open; cleanup stops it', () => {
    app.state = emptyState()
    ui.selectedPart = 0
    const opened: number[] = []
    const stop = watchPartSelect((p) => opened.push(p))
    flushSync()
    expect(opened).toEqual([])
    select(2)
    expect(opened).toEqual([2])
    // Selecting the part that's already open opens nothing.
    ui.selectedPart = 1
    select(1)
    expect(opened).toEqual([2])
    stop()
    select(3)
    expect(opened).toEqual([2])
  })
})
