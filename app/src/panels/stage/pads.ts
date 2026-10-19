// The Stage's pads (kit › Pads, Pad; D11, D33): the sixteen band pads and their bank tabs, from
// the app's state, and each pad's face and hue from its lamp. model.ts re-exports all of it.

import type { ComponentProps } from 'svelte'
import { FINGERINGS, type AppCmd, type AppState, type Pad, type PadPage } from '../../lib/api/types'
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

type Face = Pick<PadItem, 'label' | 'state'> & Partial<Pick<PadItem, 'family' | 'tag'>> & { tip: string; say?: string }

const MINUS = '−'
const sign = (d: number) => (d < 0 ? MINUS : '+')
/** A switch's face: the lime lamp when on, the plain one when off. */
const lamp = (on: boolean): PadItem['state'] => (on ? 'lamp' : 'idle')
const STOP_ACMP_LABEL: Record<string, string> = { style: 'ACMP Style', fixed: 'ACMP Fixed', off: 'ACMP Off' }
const MULTI_FACE = {
  empty: { state: 'dark', family: 'fill', say: 'empty' },
  ready: { state: 'idle', family: 'fill', say: 'ready' },
  playing: { state: 'playing', family: 'ending', say: 'playing' },
  queued: { state: 'next', family: 'intro', say: 'waiting for the bar line' },
  armed: { state: 'armed', family: 'ending', say: 'in Synchro Start standby' },
} as const satisfies Record<AppState['multiPad']['pads'][number]['lamp'], { state: PadItem['state']; family: PadItem['family']; say: string }>

/**
 * A pad on pages 2–5, as the boards draw it (PadsPage2, PadsChord, PadsMultiPads, PadsSetup):
 * the face from what the pad sends (`action`) and the state it reads. White block = chosen
 * (the loaded rack, the applied One Touch, the fingering, the Stop ACMP mode), lime = a switch
 * on, the plain face = off, dim = can't apply now. Null for an action no page here sends, so
 * the pad falls back to its lamp.
 */
function pageFace(state: AppState, action: AppCmd, sound: boolean): Face | null {
  const t = state.transport
  const c = state.chord
  const q = state.quickRacks
  const mp = state.multiPad.pads
  switch (action.type) {
    // Racks (PadsPage2)
    case 'pressQuickRack':
    case 'storeRack': {
      const b = q.buttons[action.slot]
      const id = `${'ABCDEFGH'[q.bank] ?? ''}${action.slot + 1}`
      const tip = `quick.${action.slot + 1}`
      if (q.store) return { label: b?.name || id, state: 'next', tag: '', tip, say: `Quick Rack ${id}, Store armed: tap to store the live rack here` }
      if (!b?.rack) return { label: id, state: 'dark', tip: sound ? 'quick.store_rack' : tip, say: `Quick Rack ${id}, empty` }
      const name = b.name || id
      if (b.loaded) {
        return sound
          ? { label: name, state: 'chosen', tag: 'Save over', tip: 'quick.store_rack', say: `Quick Rack ${id}, ${name}, loaded: tap to save the live rack over it` }
          : { label: name, state: 'chosen', tip, say: `Quick Rack ${id}, ${name}, loaded` }
      }
      return { label: name, state: 'idle', tip, say: `Quick Rack ${id}, ${name}${b.missing ? ', missing' : ', stored'}` }
    }
    case 'recallOts': {
      const n = action.index + 1
      const label = `OTS${NBSP}${n}`
      if (action.index >= state.ots.settings.length) return { label, state: 'dark', tip: `ots.${n}`, say: `One Touch Setting ${n}, not in this style` }
      const on = state.ots.applied === n
      return { label, state: on ? 'chosen' : 'idle', tip: `ots.${n}`, say: `One Touch Setting ${n}${on ? ', applied' : ''}` }
    }
    case 'stepQuickRackBank': {
      const can = action.delta < 0 ? q.bank > 0 : q.bank < 7
      return { label: `Bank${NBSP}${sign(action.delta)}`, state: can ? 'idle' : 'dark', tip: action.delta < 0 ? 'quick.bank_prev' : 'quick.bank_next' }
    }
    case 'toggleQuickRackStore':
      return { label: 'Store', state: lamp(q.store), tip: 'quick.store', say: `Store, ${q.store ? 'armed' : 'off'}` }
    case 'undoQuickRackStore':
      return { label: 'Undo', state: q.undo ? 'idle' : 'unavailable', tip: 'quick.undo', say: q.undo ? 'Undo store' : 'Undo store, nothing to undo' }
    // Chord (PadsChord)
    case 'toggleManualBass':
      return c.upper
        ? { label: 'Manual Bass', state: lamp(c.manualBass), tip: 'detection.manual_bass', say: `Manual Bass, ${c.manualBass ? 'on' : 'off'}` }
        : { label: 'Manual Bass', state: 'unavailable', tip: 'detection.manual_bass', say: 'Manual Bass, not available: it works only with chord detection on Upper' }
    case 'toggleStopAcmp':
      return { label: 'Stop ACMP', state: lamp(t.stopAcmp), tip: 'transport.stop_acmp', say: `Stop ACMP, ${t.stopAcmp ? 'on' : 'off'}` }
    case 'moveSplit':
      // One-shots: never lit.
      return { label: `Split${NBSP}${sign(action.delta)}`, state: 'idle', tip: action.delta < 0 ? 'split.down' : 'split.up' }
    case 'stepTranspose': {
      const down = action.keyboard < 0 || (action.keyboard === 0 && action.master < 0)
      const kbd = action.keyboard !== 0
      const v = kbd ? c.transposeKeyboard : c.transposeMaster
      const on = down ? v < 0 : v > 0
      const which = kbd ? 'keyboard' : 'master'
      return { label: `${kbd ? 'Kbd' : 'Mst'}${NBSP}Tr${NBSP}${down ? MINUS : '+'}`, state: lamp(on), tip: `transpose.${which}_${down ? 'down' : 'up'}`, say: `${kbd ? 'Keyboard' : 'Master'} transpose ${down ? MINUS : '+'}${on ? `, lit: ${v > 0 ? '+' : ''}${v}` : ''}` }
    }
    case 'resetTranspose': {
      const on = c.transposeKeyboard !== 0 || c.transposeMaster !== 0
      return { label: 'Tr Reset', state: lamp(on), tip: 'transpose.reset', say: `Transpose reset${on ? ', lit: a transpose is not 0' : ''}` }
    }
    case 'toggleRetrigger':
      return { label: 'Retrigger', state: lamp(t.retrigger), tip: 'transport.retrigger', say: `Retrigger, ${t.retrigger ? 'on' : 'off'}` }
    // Multi Pads (PadsMultiPads)
    case 'triggerMultiPad': {
      const p = mp[action.pad]
      const f = MULTI_FACE[p?.lamp ?? 'empty']
      const n = action.pad + 1
      return { label: `Pad${NBSP}${n}`, state: f.state, family: f.family, tip: `multipad.pad${n}`, say: `Multi Pad ${n}${p?.name ? `, ${p.name}` : ''}, ${f.say}` }
    }
    case 'stopAllMultiPads': {
      const any = mp.some((p) => p.lamp !== 'empty')
      const busy = mp.some((p) => p.lamp === 'playing' || p.lamp === 'queued' || p.lamp === 'armed')
      return { label: 'Stop all', state: !any ? 'dark' : busy ? 'idle' : 'unavailable', tip: 'multipad.stop_all', say: `Stop all pads${busy ? ', lit: a pad plays or waits' : ''}` }
    }
    case 'armMultiPad': {
      const p = mp[action.pad]
      const n = action.pad + 1
      const armed = p?.lamp === 'armed'
      return { label: `Select${NBSP}${n}`, state: !p || p.lamp === 'empty' ? 'dark' : lamp(armed), tip: `multipad.arm${n}`, say: `Select ${n}${armed ? ', lit: pad ' + n + ' is in Synchro Start standby' : ''}` }
    }
    case 'stopMultiPad': {
      const p = mp[action.pad]
      const n = action.pad + 1
      const sounding = p?.lamp === 'playing' || p?.lamp === 'queued'
      return { label: `Stop${NBSP}${n}`, state: !p || p.lamp === 'empty' ? 'dark' : sounding ? 'idle' : 'unavailable', tip: `multipad.stop${n}`, say: `Stop pad ${n}${sounding ? ', lit' : ''}` }
    }
    // Setup (PadsSetup)
    case 'setFingering': {
      const f = FINGERINGS.find((x) => x.id === action.fingering)
      const name = f?.name ?? action.fingering
      const on = c.fingering === action.fingering
      return { label: name.replace(' On Bass', ` On${NBSP}Bass`), state: on ? 'chosen' : 'idle', tip: `fingering.${action.fingering.replace(/[A-Z]/g, (x) => `_${x.toLowerCase()}`)}`, say: `Fingering: ${name}${on ? ', chosen' : ''}` }
    }
    case 'toggleUpper':
      return { label: 'Upper', state: lamp(c.upper), tip: 'detection.upper', say: `Chord detection Upper, ${c.upper ? 'on' : 'off'}` }
    case 'toggleOtsLink':
      return { label: 'OTS Link', state: lamp(state.ots.link), tip: 'ots.link', say: `OTS Link, ${state.ots.link ? 'on' : 'off'}` }
    case 'setStopAcmp': {
      const on = t.stopAcmpMode === action.mode
      return { label: STOP_ACMP_LABEL[action.mode], state: on ? 'chosen' : 'idle', tip: `settings.stop_acmp_${action.mode}`, say: `Stop ACMP mode: ${action.mode}${on ? ', chosen' : ''}` }
    }
    default:
      return null
  }
}

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
    const f = !fader && pad.action ? pageFace(state, pad.action, layer === 'sound') : null
    if (f) {
      const item: PadItem = { label: f.label, family: f.family ?? 'util', state: f.state, tip: f.tip, name: `${f.say ?? plain(f.label)} (pad ${i + 1})` }
      if (f.tag !== undefined) item.tag = f.tag
      return item
    }
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
