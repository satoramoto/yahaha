import type { LegendItem, PadItem } from './types'

const NB = ' '

/** The board's Sections bank (1 of 5): Main B playing, Main C next, Start / Stop running. */
export const sectionPads: PadItem[] = [
  { label: `Intro${NB}I`, family: 'intro', state: 'idle', tip: 'section.intro1' },
  { label: `Intro${NB}II`, family: 'intro', state: 'idle', tip: 'section.intro2' },
  { label: `Intro${NB}III`, family: 'intro', state: 'dark', tip: 'section.intro3', name: 'Intro III (not in this style)' },
  { label: 'Sync Start', family: 'util', state: 'idle', tip: 'transport.sync_start' },
  { label: `Ending${NB}I`, family: 'ending', state: 'idle', tip: 'section.ending1' },
  { label: `Ending${NB}II`, family: 'ending', state: 'idle', tip: 'section.ending2' },
  { label: `Ending${NB}III`, family: 'ending', state: 'dark', tip: 'section.ending3', name: 'Ending III (not in this style)' },
  { label: 'Auto Fill', family: 'util', state: 'idle', tip: 'transport.auto_fill' },
  { label: `Main${NB}A`, family: 'main', state: 'idle', tip: 'section.main_a' },
  { label: `Main${NB}B`, family: 'main', state: 'playing', tip: 'section.main_b', name: 'Main B, playing' },
  { label: `Main${NB}C`, family: 'main', state: 'next', tip: 'section.main_c', name: 'Main C, queued after bar 4 (flashing)' },
  { label: `Main${NB}D`, family: 'main', state: 'idle', tip: 'section.main_d' },
  { label: 'Break', family: 'brk', state: 'idle', tip: 'section.break' },
  { label: 'Tap', family: 'util', state: 'idle', tip: 'tempo.tap' },
  { label: 'Sync Stop', family: 'util', state: 'idle', tip: 'transport.sync_stop' },
  {
    label: 'Start / Stop',
    family: 'start',
    state: 'running',
    name: 'Start / Stop, running (pad 16; the transport Start / Stop is the same control)',
    tip: 'transport.start_stop',
  },
]

/** The Sections bank's legend. */
export const sectionLegend: LegendItem[] = [
  { label: 'Intro', hue: 'intro' },
  { label: 'Main', hue: 'main' },
  { label: 'Ending', hue: 'ending' },
  { label: 'Break', hue: 'brk' },
  { label: 'Fill', hue: 'fill' },
]

const off = (label: string, tip: string): PadItem => ({ label, family: 'util', state: 'idle', tip })
const unused = (n: number): PadItem => ({ label: '', family: 'util', state: 'dark', tip: 'launchkey.unused', name: `Pad ${n} unused` })

/** PadsPage2 (Racks, Sound latched): A1 loaded with "Save over", A2–A4 stored, A5–A8 empty, OTS 2 applied, Store off. */
export const racksPads: PadItem[] = [
  { label: 'Sunday drive', family: 'util', state: 'chosen', tag: 'Save over', tip: 'quick.store_rack' },
  off('Warm keys', 'quick.2'),
  off('Lead synth', 'quick.3'),
  off('Organ', 'quick.4'),
  ...[5, 6, 7, 8].map((n): PadItem => ({ label: `A${n}`, family: 'util', state: 'dark', tip: 'quick.store_rack' })),
  off(`OTS${NB}1`, 'ots.1'),
  { label: `OTS${NB}2`, family: 'util', state: 'chosen', tip: 'ots.2' },
  off(`OTS${NB}3`, 'ots.3'),
  off(`OTS${NB}4`, 'ots.4'),
  off(`Bank${NB}−`, 'quick.bank_prev'),
  off(`Bank${NB}+`, 'quick.bank_next'),
  off('Store', 'quick.store'),
  { label: 'Undo', family: 'util', state: 'unavailable', tip: 'quick.undo' },
]

/** PadsChord: keyboard transpose +2 (Kbd Tr + and Tr Reset lit), Manual Bass unavailable (Lower). */
export const chordPads: PadItem[] = [
  ...[1, 2, 3, 4, 5, 6, 7, 8].map(unused),
  { label: 'Manual Bass', family: 'util', state: 'unavailable', tip: 'detection.manual_bass' },
  off('Stop ACMP', 'transport.stop_acmp'),
  off(`Split${NB}−`, 'split.down'),
  off(`Split${NB}+`, 'split.up'),
  off(`Kbd${NB}Tr${NB}−`, 'transpose.keyboard_down'),
  { label: `Kbd${NB}Tr${NB}+`, family: 'util', state: 'lamp', tip: 'transpose.keyboard_up' },
  { label: 'Tr Reset', family: 'util', state: 'lamp', tip: 'transpose.reset' },
  off('Retrigger', 'transport.retrigger'),
]

/** PadsMultiPads: pad 1 playing, 2 queued, 3 armed (Select 3 lit), 4 ready; Stop 1–2 lit. */
export const multiPads: PadItem[] = [
  { label: `Pad${NB}1`, family: 'ending', state: 'playing', tip: 'multipad.pad1' },
  { label: `Pad${NB}2`, family: 'intro', state: 'next', tip: 'multipad.pad2' },
  { label: `Pad${NB}3`, family: 'ending', state: 'armed', tip: 'multipad.pad3' },
  { label: `Pad${NB}4`, family: 'fill', state: 'idle', tip: 'multipad.pad4' },
  off('Stop all', 'multipad.stop_all'),
  unused(6),
  unused(7),
  unused(8),
  off(`Select${NB}1`, 'multipad.arm1'),
  off(`Select${NB}2`, 'multipad.arm2'),
  { label: `Select${NB}3`, family: 'util', state: 'lamp', tip: 'multipad.arm3' },
  off(`Select${NB}4`, 'multipad.arm4'),
  off(`Stop${NB}1`, 'multipad.stop1'),
  off(`Stop${NB}2`, 'multipad.stop2'),
  { label: `Stop${NB}3`, family: 'util', state: 'unavailable', tip: 'multipad.stop3' },
  { label: `Stop${NB}4`, family: 'util', state: 'unavailable', tip: 'multipad.stop4' },
]

/** PadsSetup: Fingered chosen, Upper and OTS Link off, Stop ACMP mode Style chosen. */
export const setupPads: PadItem[] = [
  off('Single Finger', 'fingering.single_finger'),
  { label: 'Fingered', family: 'util', state: 'chosen', tip: 'fingering.fingered' },
  off(`Fingered On${NB}Bass`, 'fingering.fingered_on_bass'),
  off('Multi Finger', 'fingering.multi_finger'),
  off('AI Fingered', 'fingering.ai_fingered'),
  off('Full Keyboard', 'fingering.full_keyboard'),
  off('AI Full Keyboard', 'fingering.ai_full_keyboard'),
  off('Upper', 'detection.upper'),
  off('OTS Link', 'ots.link'),
  { label: 'ACMP Style', family: 'util', state: 'chosen', tip: 'settings.stop_acmp_style' },
  off('ACMP Fixed', 'settings.stop_acmp_fixed'),
  ...[12, 13, 14, 15, 16].map(unused),
]

/** The pad banks, one header tab each. */
export const padBanks = ['Sections', 'Quick Racks', 'Chord', 'Multi Pads', 'Setup']

/** The board's bank name and its old counter (PadBank no longer draws the counter). */
export const sectionBank = { name: 'Sections', count: '1/5' }
