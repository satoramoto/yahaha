// Setting the split on the main keyboard: the Keys' callbacks as the split command, the lock, and
// the keys' props on every screen (model.ts `keys`).

import { describe, expect, it } from 'vitest'
import { MockSession } from '../../lib/api/mock'
import type { AppCmd, AppState } from '../../lib/api/types'
import { keys } from './model'
import { keysActions, SPLIT_MAX, SPLIT_MIN } from './splitPick.svelte'

function setup(edit?: (s: AppState) => void) {
  const session = new MockSession({ demo: false, manual: true })
  session.advance(16)
  edit?.(session.state)
  const sent: AppCmd[] = []
  const armed: boolean[] = []
  const cb = keysActions({
    state: () => session.state,
    send: (cmd) => {
      sent.push(cmd)
      session.send(cmd)
      session.advance(16)
    },
    arm: (on) => armed.push(on),
  })
  return { session, sent, armed, cb }
}

describe('keysActions', () => {
  it('a split dragged or picked on the keys becomes setSplit, black keys included, and round-trips', () => {
    const { session, sent, cb } = setup((s) => (s.paramLocks.splitPoint = false))
    cb.onsplit(60)
    cb.onsplit(54)
    expect(sent).toEqual([
      { type: 'setSplit', note: 60 },
      { type: 'setSplit', note: 54 },
    ])
    expect(session.state.chord.split).toBe(54)
    expect(session.state.chord.splitName).toBe('F#2')
    cb.onsplit(61)
    expect(session.state.chord.split).toBe(61)
    expect(session.state.chord.splitName).toBe('C#3')
    expect(keys(session.state, 61).split).toBe(61)
  })

  it('clamps to the engine range and sends nothing for the split already there', () => {
    const { sent, cb, session } = setup((s) => (s.paramLocks.splitPoint = false))
    cb.onsplit(5)
    expect(sent.at(-1)).toEqual({ type: 'setSplit', note: SPLIT_MIN })
    cb.onsplit(127)
    expect(sent.at(-1)).toEqual({ type: 'setSplit', note: SPLIT_MAX })
    const before = sent.length
    cb.onsplit(session.state.chord.split)
    expect(sent.length).toBe(before)
  })

  it('a locked split point: nothing is sent and the pick will not arm', () => {
    const { sent, armed, cb } = setup((s) => (s.paramLocks.splitPoint = true))
    cb.onsplit(60)
    cb.onpick(true)
    expect(sent).toEqual([])
    expect(armed).toEqual([false])
  })

  it('arms and disarms the pick', () => {
    const { armed, cb } = setup((s) => (s.paramLocks.splitPoint = false))
    cb.onpick(true)
    cb.onpick(false)
    expect(armed).toEqual([true, false])
  })
})

describe('keys', () => {
  it('carries the split range, the lock and the armed pick (never armed while locked)', () => {
    const { session } = setup((s) => (s.paramLocks.splitPoint = false))
    expect(keys(session.state, 61, true)).toMatchObject({ splitMin: SPLIT_MIN, splitMax: SPLIT_MAX, splitLocked: false, picking: true })
    session.state.paramLocks.splitPoint = true
    expect(keys(session.state, 61, true)).toMatchObject({ splitLocked: true, picking: false })
  })
})
