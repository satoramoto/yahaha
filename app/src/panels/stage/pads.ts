// The Stage's pads (kit › Pads, Pad; D11, D33): the sixteen band pads and their bank tabs, from
// the app's state, and each pad's face and hue from its lamp. model.ts re-exports all of it.

import type { ComponentProps } from 'svelte'
import type { Pad, PadPage } from '../../lib/api/types'
import type { PadItem } from '../../ui/PadBank/types'
import type Stage from '../../ui/Stage/Stage.svelte'
import type { StageInput } from './model'

type StageProps = ComponentProps<typeof Stage>

const NBSP = ' '

/** The Sections page, fixed (DECISIONS H3): caption, family, tooltip. */
const SECTION_PADS: { label: string; family: PadItem['family']; tip: string }[] = [
  { label: `Intro${NBSP}I`, family: 'intro', tip: 'section.intro1' },
  { label: `Intro${NBSP}II`, family: 'intro', tip: 'section.intro2' },
  { label: `Intro${NBSP}III`, family: 'intro', tip: 'section.intro3' },
  { label: 'Sync Start', family: 'util', tip: 'transport.sync_start' },
  { label: `Ending${NBSP}I`, family: 'ending', tip: 'section.ending1' },
  { label: `Ending${NBSP}II`, family: 'ending', tip: 'section.ending2' },
  { label: `Ending${NBSP}III`, family: 'ending', tip: 'section.ending3' },
  { label: 'Auto Fill', family: 'util', tip: 'transport.auto_fill' },
  { label: `Main${NBSP}A`, family: 'main', tip: 'section.main_a' },
  { label: `Main${NBSP}B`, family: 'main', tip: 'section.main_b' },
  { label: `Main${NBSP}C`, family: 'main', tip: 'section.main_c' },
  { label: `Main${NBSP}D`, family: 'main', tip: 'section.main_d' },
  { label: 'Break', family: 'brk', tip: 'section.break' },
  { label: 'Tap', family: 'util', tip: 'tempo.tap' },
  { label: 'Sync Stop', family: 'util', tip: 'transport.sync_stop' },
  { label: 'Start / Stop', family: 'start', tip: 'transport.start_stop' },
]

const FALLBACK_TIP: Record<PadPage, string> = {
  sections: 'launchkey.unused',
  racks: 'padpage.racks',
  chord: 'padpage.chord',
  multiPads: 'padpage.multi_pads',
  setup: 'padpage.setup',
}

/** Each pad bank tab's tooltip. */
const BANK_TIP: Record<PadPage, string> = { ...FALLBACK_TIP, sections: 'padpage.sections' }

/**
 * A pad's face from its lamp, as the old screen pads read it (develop's HwPad): off = absent
 * (dark), flashing = queued (next), pulsing = armed, bright = on (playing), dim = available
 * (idle). Whether the pad has an action doesn't change how it lights: the hardware lights
 * it the same.
 */
export function padFace(pad: Pick<Pad, 'level' | 'anim'>): PadItem['state'] {
  if (pad.level === 'off') return 'dark'
  if (pad.anim === 'flash') return 'next'
  if (pad.anim === 'pulse') return 'armed'
  if (pad.level === 'bright') return 'playing'
  return 'idle'
}

/** The kit hues a pad colour maps onto, by hue angle (degrees). */
const PAD_HUES: { family: PadItem['family']; deg: number }[] = [
  { family: 'ending', deg: 0 }, // red: Ending, a loaded Quick Rack, a Multi Pad playing, Stop
  { family: 'r3', deg: 25 }, // orange: Sync Start, the Racks page, a Multi Pad waiting
  { family: 'intro', deg: 45 }, // amber / yellow: Intro, the Multi Pads page
  { family: 'main', deg: 125 }, // green: Main
  { family: 'l', deg: 180 }, // teal / cyan: Sync Stop, the Chord page
  { family: 'r1', deg: 220 }, // blue: Auto Fill, a stored Quick Rack, a Multi Pad with data
  { family: 'brk', deg: 280 }, // purple: Break
  { family: 'r2', deg: 325 }, // pink / magenta: the Setup page
  { family: 'ending', deg: 360 },
]

/**
 * The kit hue nearest the colour the engine lights a pad in (`pad.rgb`, 0–127 a channel), so
 * every pad keeps its old colour in the kit's palette (develop's HwPad drew `pad.rgb`): a
 * grey or unlit colour is neutral (`util`). Null for black (no colour sent).
 */
export function padHue(rgb: Pad['rgb']): PadItem['family'] | null {
  const [r, g, b] = rgb
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  if (max <= 0) return null
  if ((max - min) / max < 0.25) return 'util'
  const c = max - min
  const h = max === r ? ((g - b) / c + 6) % 6 : max === g ? (b - r) / c + 2 : (r - g) / c + 4
  const deg = h * 60
  let best = PAD_HUES[0]
  for (const x of PAD_HUES) if (Math.abs(x.deg - deg) < Math.abs(best.deg - deg)) best = x
  return best.family
}

const WORDS: Partial<Record<PadItem['state'], string>> = { playing: ', on', next: ', queued', armed: ', armed', dark: ', unavailable' }
const SECTION_WORDS: Partial<Record<PadItem['state'], string>> = { ...WORDS, playing: ', playing', dark: ' (not in this style)' }
const plain = (label: string) => label.replaceAll(NBSP, ' ')

export function pads(input: Pick<StageInput, 'state' | 'beats'>): StageProps['pads'] {
  const { state } = input
  const p = state.pads
  // A hold shows its own pads, as the session publishes them in `pads.pads`: Racks while
  // Sound is held, the fader picker while the master fader's button is. `page` stays the one
  // underneath (it comes back on release), so the layer decides what's drawn.
  const layer = state.surface.layer.type
  const fader = layer === 'fader'
  const shown: PadPage = layer === 'sound' ? 'racks' : p.page
  const sections = shown === 'sections' && !fader
  const items = Array.from({ length: 16 }, (_, i): PadItem => {
    const pad = p.pads[i]
    if (sections) {
      const s = SECTION_PADS[i]
      if (s.family === 'start') {
        // Green while running, red while stopped, as the engine lights it (develop's pad).
        const running = state.transport.running
        const lamp = pad ? padHue(pad.rgb) : null
        const stopped = !running && lamp !== null && lamp !== 'main' && pad?.level !== 'off'
        return {
          ...s,
          family: stopped ? lamp : 'start',
          state: running ? 'running' : stopped ? padFace(pad!) : 'idle',
          name: `Start / Stop (pad 16), ${running ? 'running' : 'stopped'}`,
        }
      }
      const face = pad ? padFace(pad) : 'dark'
      const word = SECTION_WORDS[face]
      return {
        ...s,
        family: (pad && padHue(pad.rgb)) ?? s.family,
        state: face,
        name: word ? `${plain(s.label)} (pad ${i + 1})${word}` : undefined,
      }
    }
    // The other pages: captioned and coloured as the state sends (develop's HwPad).
    const label = pad?.label ?? ''
    if (!pad || label === '') return { label: '', family: 'util', state: 'dark', tip: 'launchkey.unused', name: `Pad ${i + 1} unused` }
    const face = padFace(pad)
    const word = WORDS[face] ?? ''
    return { label, family: padHue(pad.rgb) ?? 'util', state: face, tip: fader ? (i < 8 ? 'mixer.page' : 'mixer.layer') : FALLBACK_TIP[shown], name: `${label} (pad ${i + 1})${word}` }
  })
  return {
    pads: items,
    // The page order Pad Bank ▲/▼ walk (Sections, then `settings.padPages`), one tab each.
    // The fader picker isn't a bank: its one tab names it ("Faders").
    banks: fader ? [] : p.pages.map((x) => x.name),
    bank: fader ? 0 : Math.max(0, p.pages.findIndex((x) => x.page === shown)),
    bankTips: fader ? [] : p.pages.map((x) => BANK_TIP[x.page]),
    bankName: p.pageName,
    // No hue legend: on the grid the Pads header has no room beside the bank tabs, and every
    // section pad names its section.
    legend: [],
    // Queued pads flash on the LED clock, as the hardware's do.
    lit: input.beats - Math.floor(input.beats) < 0.5,
  }
}
