// The prompts' model (docs/specs/push/Prompts.md › Prompts): which one shows, and each one's
// data, as pure functions of the state and the app's own open questions. PromptHost renders it.

import { quickLabel } from '../../lib/api/quick-racks'
import type { AppState, QuickRackButton, RackSwitch } from '../../lib/api/types'
import type { FilePick } from '../../lib/files'

export const PART_NAMES = ['Right 1', 'Right 2', 'Right 3', 'Left'] as const
export const PART_TAGS = ['R1', 'R2', 'R3', 'L'] as const
export const PART_HUES = ['r1', 'r2', 'r3', 'l'] as const

export type SoundNamePart = { part: number; partName: string; suggested: string; origin: string | null }

/** The one prompt on show, with its data. */
export type Prompt =
  | { kind: 'openFile'; pick: FilePick }
  | { kind: 'soundNames'; parts: SoundNamePart[]; saveAs: string | null }
  | { kind: 'unsavedChanges'; rack: { name: string; id: string | null }; then: RackSwitch }
  | { kind: 'store'; bank: number; buttons: QuickRackButton[]; slot: number; rack: { name: string; id: string | null; modified: boolean } }
  | { kind: 'deleteRack'; rack: { id: string; name: string }; slots: string[]; ots: number[]; styleName: string }

/** The app's own open questions: the rack a Delete… asks about, the file chooser that is up. */
export type AppAsks = { deleteRack: string | null; openFile: FilePick | null }

/** "Factory" for a plugin's factory preset, "File" for a user preset file, else null. */
export function soundOrigin(id: string | undefined): string | null {
  if (!id || !id.startsWith('au:')) return null
  if (id.includes('#f:')) return 'Factory'
  if (id.includes('#u:')) return 'File'
  return null
}

/** The first that applies: the file chooser's wait, Sound names, Unsaved changes, Store, Delete. */
export function pickPrompt(state: AppState, asks: AppAsks): Prompt | null {
  if (asks.openFile) return { kind: 'openFile', pick: asks.openFile }
  const live = state.liveRack
  const p = live.prompt
  if (p?.kind === 'soundNames') {
    const parts = p.parts.map(({ part, suggested }) => {
      const kp = state.keyboardParts[part]
      return { part, partName: PART_NAMES[part] ?? `Part ${part + 1}`, suggested: suggested || kp?.voiceName || '', origin: soundOrigin(kp?.sound?.id) }
    })
    return { kind: 'soundNames', parts, saveAs: p.saveAs }
  }
  if (p?.kind === 'unsavedChanges') return { kind: 'unsavedChanges', rack: { name: live.name, id: live.id }, then: p.then }
  const q = state.quickRacks
  if (q.storeWaiting !== null) {
    return { kind: 'store', bank: q.bank, buttons: q.buttons, slot: q.storeWaiting, rack: { name: live.name, id: live.id, modified: live.modified } }
  }
  const id = asks.deleteRack
  const r = id === null ? undefined : state.racks.find((x) => x.id === id)
  if (r && r.id !== live.id) {
    const slots = q.buttons.flatMap((b, i) => (b.rack === r.id ? [quickLabel(q.bank, i)] : []))
    const ots = state.ots.racks.flatMap((o, i) => (o.rack === r.id ? [i + 1] : []))
    return { kind: 'deleteRack', rack: { id: r.id, name: r.name }, slots, ots, styleName: state.style.name }
  }
  return null
}

/** "A4", "A4 and A7", "A2, A4 and A7". */
export function listOf(items: (string | number)[]): string {
  const s = items.map(String)
  if (s.length <= 1) return s.join('')
  return `${s.slice(0, -1).join(', ')} and ${s[s.length - 1]}`
}

/** The Store prompt's middle sentence, by how the live rack stands. */
export function storeReason(rack: { name: string; id: string | null; modified: boolean }): { before: string; name: string | null; after: string } {
  if (rack.id === null) return { before: 'This rack has never been saved, so it needs a name first.', name: null, after: '' }
  if (rack.modified) return { before: '', name: rack.name, after: ' has unsaved changes, so it is saved first.' }
  return { before: '', name: rack.name, after: "'s saved rack is gone, so it is saved again." }
}

/** Delete's aria-label for its destructive button. */
export function deleteLabel(name: string, slots: string[], ots: number[]): string {
  const clauses: string[] = []
  if (slots.length) clauses.push(`empties Quick Rack${slots.length > 1 ? 's' : ''} ${listOf(slots)}`)
  if (ots.length) clauses.push(`returns One Touch ${listOf(ots)} to the style's own`)
  return clauses.length ? `Delete ${name}: ${clauses.join(' and ')}` : `Delete ${name}`
}
