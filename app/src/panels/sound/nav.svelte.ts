// Library › Style map's GM map page: which map the rule controls edit (app-only state), and
// the names the map and the Rack panel show for patches and sounds.

import type { FontPreset, GmLayer, GmMapRow, PatchInfo, SoundEntry, SoundLibraryState } from '../../lib/api/types'

/** A family's program range as the list shows it: "Ch 10" for the drums (-1), else "49–56". */
export const familyRange = (f: number): string => (f < 0 ? 'Ch 10' : `${f * 8 + 1}–${f * 8 + 8}`)

/** The chosen program of family `f`: `picked` when it is in the family, else the family's first
 * auto program, else its first. The drums (-1) have one row, the kit: -1. */
export function chosenProgram(rows: GmMapRow[], f: number, picked: number | null): number {
  if (f < 0) return -1
  if (picked !== null && Math.floor(picked / 8) === f) return picked
  const fam = rows.filter((r) => r.family === f && r.program !== null)
  return (fam.find((r) => r.resolved.layer === 'auto') ?? fam[0])?.program ?? f * 8
}

class SoundNav {
  /** The rule controls edit this style's own map instead of the global one. */
  styleScope = $state(false)
  /** The chosen family: 0–15, or -1 for the drums. */
  family = $state(0)
  /** The chosen program (0–127) the "Add and map" button maps to; null: the family's first auto
   * program, else its first. */
  program = $state<number | null>(null)
  /** The chosen SoundFont preset on the Add from SoundFont column, `bank:program`. */
  preset = $state<string | null>(null)

  reset() {
    this.styleScope = false
    this.family = 0
    this.program = null
    this.preset = null
  }
}

export const nav = new SoundNav()

/** What a patch's source says, e.g. "GeneralUser-GS · 0:34" or "Audio Unit aumu dls  appl". */
export function sourceText(p: PatchInfo): string {
  if (p.source.kind === 'plugin') return `Audio Unit · ${p.source.componentId}`
  const font = p.source.file.replace(/\.sf2$/i, '')
  return p.source.bank >= 128 ? `${font} · drum kit ${p.source.program + 1}` : `${font} · ${p.source.bank}:${p.source.program + 1}`
}

/** A patch's name by id ('—' for none). */
export function patchName(sl: SoundLibraryState, id: string | null): string {
  if (!id) return '—'
  return sl.patches.find((p) => p.id === id)?.name ?? id
}

const LAYERS: Record<GmLayer, string> = { drums: 'Drums', override: 'Override', family: 'Family', auto: 'Auto', none: 'Unset' }

/** The GM map layer's badge text. */
export const layerLabel = (l: GmLayer): string => LAYERS[l]

/** A resolved Sound's name: a library patch's, the catalog's, else its font preset
 * ("GeneralUser-GS · 0:1"). '—' for none. */
export function soundName(sl: SoundLibraryState, entries: SoundEntry[], id: string | null, font: FontPreset | null): string {
  if (!id) return '—'
  if (id.startsWith('saved:')) return patchName(sl, id.slice(6))
  const e = entries.find((x) => x.id === id)
  if (e) return e.name
  if (!font) return id
  const f = font.file.replace(/\.sf2$/i, '')
  return font.bank >= 128 ? `${f} · kit ${font.program + 1}` : `${f} · ${font.bank}:${font.program + 1}`
}
