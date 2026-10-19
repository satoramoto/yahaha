// The swap panel's props (SwapPanel, PadsPage2 state B) from the app state, typed structurally
// so the UI library imports no API: the held part (`surface.layer` swap), its name, and the
// eight swap knobs as they read (knob 1 the sound: "23 Rhodes Soft", mid-dial until release).

/** The part labels and hues, by keyboard part index (0-3): Right 1, Right 2, Right 3, Left. */
export const SWAP_LABELS = ['R1', 'R2', 'R3', 'L'] as const
export const SWAP_HUES = ['r1', 'r2', 'r3', 'l'] as const
export const SWAP_PART_NAMES = ['Right 1', 'Right 2', 'Right 3', 'Left'] as const
export type SwapHue = (typeof SWAP_HUES)[number]

/** The swap knobs' plain names (docs/eyes-free.md): the sound, then the part's mix. */
export const SWAP_NAMES = ['Sound', 'Level', 'Pan', 'Reverb', 'Chorus', 'Delay', 'Insert 1', 'Send 4']

export interface SwapKnob {
  /** "K1" … "K8". */
  k: string
  name: string
  value: string
}

export interface SwapPanelData {
  part: number
  label: string
  name: string
  hue: SwapHue
  /** Knob 1's reading: the sound number and name, or "-". */
  sound: string
  knobs: SwapKnob[]
}

/** What `swapPanel` reads from the app state. */
export interface SwapInput {
  surface: { layer: { type: string; part?: number } }
  knobs: { knobs: { value: string }[] }
}

/** The swap panel's data, or null when no part is held in swap mode. */
export function swapPanel(state: SwapInput): SwapPanelData | null {
  const layer = state.surface.layer
  if (layer.type !== 'swap' || layer.part === undefined || layer.part < 0 || layer.part > 3) return null
  const part = layer.part
  const knobs = SWAP_NAMES.map((name, i) => ({ k: `K${i + 1}`, name, value: state.knobs.knobs[i]?.value || '-' }))
  return {
    part,
    label: SWAP_LABELS[part],
    name: SWAP_PART_NAMES[part],
    hue: SWAP_HUES[part],
    sound: knobs[0].value,
    knobs,
  }
}
