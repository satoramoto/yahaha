// The Looper page's wiring, kept out of the component so it can be tested: the engine's Chord
// Looper state (with the page's own UI state) to the props of the library's Looper
// (app/src/ui/Looper), and the page's changes to commands. docs/chord-looper.md.

import type { AppCmd, AppState, LooperState } from '../../lib/api/types'
import { sameFile } from '../../lib/format'
import type { LoopBarItem, LooperChange, LooperPageData } from '../../ui/Looper/types'

/** What only the page keeps: the Memory / Clear latch, the Load list and the typed bank name. */
export interface LooperLocal {
  pick: 'store' | 'clear' | null
  loadOpen: boolean
  /** The Save as… form's typed name; null: closed. */
  saveAs: string | null
}

export const LOCAL_CLOSED: LooperLocal = { pick: null, loadOpen: false, saveAs: null }

/** The sequence as bars 1…bars, each with its chord changes (empty: the chord holds). */
export function barsOf(lp: Pick<LooperState, 'bars' | 'chords'>): LoopBarItem[] {
  return Array.from({ length: lp.bars }, (_, i) => ({
    bar: i + 1,
    chords: lp.chords.filter((c) => c.bar === i + 1).map((c) => ({ chord: c.chord, beat: c.beat })),
  }))
}

/** The typed name is another bank's file (as the backend names files): Save is refused. */
export function clashes(lp: Pick<LooperState, 'banks' | 'bankPath'>, name: string): boolean {
  return !!name.trim() && lp.banks.some((b) => sameFile(b.name, name) && b.path !== lp.bankPath)
}

/** Where the playhead is in the bar (0–1) from the clock's position in beats; null when none shows. */
export function playheadOf(lp: Pick<LooperState, 'mode' | 'bar'>, running: boolean, pos: number, beatsPerBar: number): number | null {
  if (!running || lp.bar === null || (lp.mode !== 'looping' && lp.mode !== 'recording')) return null
  const bpb = Math.max(1, beatsPerBar)
  return (((pos % bpb) + bpb) % bpb) / bpb
}

/** The page's props from the state, the page's own state and the clock. */
export function looperPage(state: AppState, local: LooperLocal, pos = 0): LooperPageData {
  const lp = state.looper
  const running = state.transport.running
  return {
    mode: lp.mode,
    hasData: lp.hasData,
    bar: lp.bar,
    bars: lp.bars,
    sequence: barsOf(lp),
    playhead: playheadOf(lp, running, pos, state.transport.beatsPerBar),
    running,
    memories: lp.memories.map((m) => ({ name: m.name, bars: m.bars, summary: m.chords.map((c) => c.chord).join(' ') })),
    memory: lp.memory,
    pendingMemory: lp.pendingMemory,
    pick: local.pick,
    bankName: lp.bankName,
    bankSaved: lp.bankPath !== null,
    bankPath: lp.bankPath,
    banks: lp.banks,
    loadOpen: local.loadOpen,
    saveAs: local.saveAs === null ? null : { name: local.saveAs, clash: clashes(lp, local.saveAs) },
  }
}

/** A change from the page: the commands it sends and the page's next own state. */
export function looperChange(
  change: LooperChange,
  local: LooperLocal,
  lp: Pick<LooperState, 'banks' | 'bankPath'>,
): { cmds: AppCmd[]; local: LooperLocal } {
  switch (change.type) {
    case 'rec':
      return { cmds: [{ type: 'looperRec' }], local }
    case 'onOff':
      return { cmds: [{ type: 'looperOnOff' }], local }
    case 'pick':
      return { cmds: [], local: { ...local, pick: change.pick } }
    case 'memory': {
      const index = change.index
      const cmd: AppCmd =
        local.pick === 'store'
          ? { type: 'storeLooperMemory', index }
          : local.pick === 'clear'
            ? { type: 'clearLooperMemory', index }
            : { type: 'selectLooperMemory', index }
      return { cmds: [cmd], local: { ...local, pick: null } }
    }
    case 'newBank':
      return { cmds: [{ type: 'newLooperBank' }], local: { ...local, loadOpen: false } }
    case 'loadOpen':
      return { cmds: [], local: { ...local, loadOpen: change.open, saveAs: change.open ? null : local.saveAs } }
    case 'load':
      return { cmds: [{ type: 'loadLooperBank', path: change.path }], local: { ...local, loadOpen: false } }
    case 'saveAsOpen':
      return { cmds: [], local: { ...local, saveAs: change.open ? '' : null, loadOpen: false } }
    case 'saveAsName':
      return { cmds: [], local: { ...local, saveAs: change.name } }
    case 'save': {
      const name = (local.saveAs ?? '').trim()
      // A clash saves nothing unless it is the Overwrite; the form stays so another name can be typed.
      if (!change.overwrite && clashes(lp, name)) return { cmds: [], local }
      const cmd: AppCmd = { type: 'saveLooperBank', name: name || null, ...(change.overwrite ? { overwrite: true } : {}) }
      return { cmds: [cmd], local: { ...local, saveAs: null } }
    }
  }
}
