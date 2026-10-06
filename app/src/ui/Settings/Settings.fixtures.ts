import { boardAppBar } from '../AppBar/AppBar.fixtures'
import { boardKeys } from '../Keys/Keys.fixtures'
import { sectionRowBoard } from '../SectionRow/SectionRow.fixtures'
import { chordBoard } from '../SettingsChord/SettingsChord.fixtures'
import { keyboardBoard } from '../SettingsKeyboard/SettingsKeyboard.fixtures'
import { launchkeyBoard } from '../SettingsLaunchkey/SettingsLaunchkey.fixtures'
import { pedalsBoard } from '../SettingsPedals/SettingsPedals.fixtures'
import { styleBoard } from '../SettingsStyle/SettingsStyle.fixtures'
import { systemBoard } from '../SettingsSystem/SettingsSystem.fixtures'
import type { NowPlayingCompactData, SettingsPageItem } from './types'

/** The six pages as the boards' left column lists them. */
export const settingsPageItems: SettingsPageItem[] = [
  { id: 'chord', label: 'Chord & Split', summary: 'Fingered · F#2', also: 'Also on Pads · Chord and Setup pages', tip: 'settings.tab.chord' },
  { id: 'style', label: 'Style', summary: 'Next bar', also: 'Also on Knobs · Style page', tip: 'settings.tab.style' },
  { id: 'keyboard', label: 'Keyboard', summary: '0 · 0 · Split locked', also: 'Transpose · Parameter lock', tip: 'settings.tab.keyboard' },
  { id: 'pedals', label: 'Pedals', summary: '64 66 67', also: 'P1 Launchkey jack · P2 P3 any MIDI input', tip: 'settings.tab.controllers' },
  { id: 'system', label: 'System', summary: '128 · All inputs · 1,284 styles', also: 'Audio · MIDI · Library', tip: 'settings.tab.system' },
  { id: 'launchkey', label: 'Launchkey', summary: '5 of 5 pad pages', also: 'Pad pages shown 5 of 5', tip: 'settings.tab.launchkey' },
]

/** The compact block on every Settings board: Sunday Drive Pop at 104, Am7 in Main B. */
export const settingsNowPlaying: NowPlayingCompactData = {
  style: 'Sunday Drive Pop',
  bpm: 104,
  running: true,
  chord: 'Am',
  ext: '7',
  notes: 'A C E G',
  section: 'Main B',
  hue: 'main',
}

/** The dark boards: the Settings tab chosen, running, the Chord & Split page open. */
export const settingsBoard = {
  appBar: { ...boardAppBar, chosen: 'settings' },
  sectionRow: { ...sectionRowBoard, running: true },
  nowPlaying: settingsNowPlaying,
  pages: settingsPageItems,
  page: 'chord' as const,
  chord: chordBoard,
  style: styleBoard,
  keyboard: keyboardBoard,
  pedals: pedalsBoard,
  system: systemBoard,
  launchkey: launchkeyBoard,
  status: { text: null },
  keys: boardKeys,
}
