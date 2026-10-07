// The Multi Pads page's wiring: the app state as the page's data (ui/MultiPads), and the page's
// requests as app commands.

import type { AppCmd, AppState } from '../../lib/api/types'
import { pickFile, type FilePick } from '../../lib/files'
import type { MultiPadsChange, MultiPadsData } from '../../ui/MultiPads/types'

/**
 * What the Multi Pads page draws, from the app state and the LED clock (`clock.beats`): queued and
 * armed pads flash on its first half-beat, as the band's pads do.
 */
export function multiPadsData(state: AppState, beats: number): MultiPadsData {
  const mp = state.multiPad
  return {
    banks: mp.banks.map((b) => ({ id: String(b.id), name: b.name, folder: b.folder })),
    bank: mp.bank ? String(mp.bank.id) : null,
    bankName: mp.bank?.name ?? '',
    loading: mp.loading,
    pads: mp.pads.map((p) => ({ name: p.name, lamp: p.lamp, repeat: p.repeat, chordMatch: p.chordMatch, channel: p.channel })),
    lit: beats - Math.floor(beats) < 0.5,
    running: state.transport.running,
    volume: state.mixer.multiPadVolume,
    volumeWaiting: state.mixer.multiPadVolumeWaiting,
    synchroStop: { ...mp.synchroStop },
  }
}

/** What Load… asks the system file picker for. */
export const PAD_FILE: FilePick = { title: 'Load a Multi Pad bank', filter: { name: 'Multi Pad banks', extensions: ['pad'] } }

/** Load…: opens the system file picker for a `.pad` file and loads the one picked; a cancel sends nothing. */
export async function loadPadFile(send: (cmd: AppCmd) => void, pick: (p: FilePick) => Promise<string | null> = pickFile): Promise<void> {
  const path = await pick(PAD_FILE)
  if (path) send({ type: 'loadMultiPadPath', path })
}

/** The page's requests that are one command each (Load… opens the file picker first: `loadPadFile`). */
export type MultiPadsCommandChange = Exclude<MultiPadsChange, { type: 'loadFile' }>

/** The command a page request sends. */
export function multiPadsCommand(change: MultiPadsCommandChange): AppCmd {
  switch (change.type) {
    case 'play':
      return { type: 'triggerMultiPad', pad: change.pad }
    case 'stop':
      return { type: 'stopMultiPad', pad: change.pad }
    case 'select':
      return { type: 'armMultiPad', pad: change.pad }
    case 'stopAll':
      return { type: 'stopAllMultiPads' }
    case 'repeat':
      return { type: 'setMultiPadRepeat', pad: change.pad, on: change.on }
    case 'chordMatch':
      return { type: 'setMultiPadChordMatch', pad: change.pad, on: change.on }
    case 'bank':
      return { type: 'loadMultiPad', id: Number(change.id) }
    case 'clear':
      return { type: 'clearMultiPad' }
    case 'volume':
      return { type: 'setMultiPadVolume', volume: change.volume }
    case 'synchroStop':
      return { type: 'setMultiPadSynchroStop', styleStop: change.styleStop, ending: change.ending }
  }
}
