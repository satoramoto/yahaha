// What the Harm/Arp page's changes do: each `HarmArpChange` (ui/HarmArp/types.ts) as the one
// command it sends, or null when it changes nothing (the library's HarmArp reports every click,
// the already-chosen value's too). Pure: HarmArpPage.svelte sends what this returns.

import type { AppCmd, HarmonyArpState } from '../../lib/api/types'
import type { HarmArpChange } from '../../ui/HarmArp/types'

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(v)))

/** The command for `change` on state `h`; null: a no-op. */
export function harmArpCommand(change: HarmArpChange, h: HarmonyArpState): AppCmd | null {
  switch (change.type) {
    case 'on':
      return { type: 'setHarmonyArpOn', on: change.on }
    case 'pick':
      if (change.group === 'harmony') {
        if (h.mode === 'harmony' && h.harmonyType === change.index) return null
        return { type: 'setHarmonyType', index: change.index }
      }
      if (h.mode === 'arpeggio' && h.arpPattern === change.index) return null
      return { type: 'setArpPattern', index: change.index }
    case 'assign':
      // Against the state's assign: an arpeggio shows a 'multi' as Auto, and Auto then sends 'auto'.
      return change.assign === h.assign ? null : { type: 'setHarmonyAssign', assign: change.assign }
    case 'volume':
      return { type: 'setHarmonyVolume', volume: clamp(change.volume, 0, 127) }
    case 'touchLimit':
      return { type: 'setTouchLimit', velocity: clamp(change.velocity, 1, 127) }
    case 'speed':
      return change.speed === h.speed ? null : { type: 'setHarmonySpeed', speed: change.speed }
    case 'chordNoteOnly':
      return { type: 'setChordNoteOnly', on: change.on }
    case 'quantize':
      return change.quantize === h.arp.quantize ? null : { type: 'setArpQuantize', quantize: change.quantize }
    case 'hold':
      return { type: 'setArpHold', on: change.on }
    case 'pedalHold':
      return { type: 'setArpPedalHold', on: change.on }
    case 'velocity': {
      const velocity = clamp(change.velocity, 1, 127)
      if (change.mode === h.arp.velocity && velocity === h.arp.fixedVelocity) return null
      return { type: 'setArpVelocity', mode: change.mode, velocity }
    }
    case 'keepKeyOn':
      return { type: 'setArpKeepKeyOn', on: change.on }
  }
}
