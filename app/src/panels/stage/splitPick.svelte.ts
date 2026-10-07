// The split point, set on the main keyboard (the library's Keys) on every screen that shows it:
// the armed pick is one app-wide flag, so arming it on the Chord & Split page ("Set on the keys")
// shows the ring on the keys below, and the Stage's keys share it. `keysActions` turns the Keys'
// callbacks into the split command; the split lock (paramLocks.splitPoint) blocks both.

import type { AppCmd, AppState } from '../../lib/api/types'

/** The split's range, as the engine clamps it. */
export const SPLIT_MIN = 24
export const SPLIT_MAX = 96

class SplitPick {
  /** Armed: the next key clicked on the main keyboard becomes the split. */
  armed = $state(false)
}

export const splitPick = new SplitPick()

export interface KeysDeps {
  state: () => AppState
  send: (cmd: AppCmd) => void
  /** Arm or disarm the pick (`splitPick.armed`). */
  arm: (armed: boolean) => void
}

/** The main keyboard's callbacks: a split asked for becomes `setSplit`; arming follows the flag. */
export function keysActions(d: KeysDeps): { onsplit: (note: number) => void; onpick: (armed: boolean) => void } {
  return {
    onsplit: (note) => {
      const s = d.state()
      if (s.paramLocks.splitPoint) return
      const next = Math.max(SPLIT_MIN, Math.min(SPLIT_MAX, Math.round(note)))
      if (next !== s.chord.split) d.send({ type: 'setSplit', note: next })
    },
    onpick: (armed) => d.arm(armed && !d.state().paramLocks.splitPoint),
  }
}
