import type { ComponentProps } from 'svelte'
import { boardAppBar } from '../AppBar/AppBar.fixtures'
import { faderPageTabs, layerTabs } from '../ChosenTabs/ChosenTabs.fixtures'
import { displayBoard, displayStopped } from '../Display/Display.fixtures'
import { functionLamps, panelStrips, partLamps, reverbStrips } from '../FaderBank/FaderBank.fixtures'
import { boardKeys } from '../Keys/Keys.fixtures'
import { styleKnobPage, styleKnobs } from '../KnobBank/KnobBank.fixtures'
import { sectionBank, sectionLegend, sectionPads } from '../PadBank/PadBank.fixtures'
import { sectionRowBoard } from '../SectionRow/SectionRow.fixtures'
import { transportBoard } from '../TransportColumn/TransportColumn.fixtures'
import type Stage from './Stage.svelte'

/** The dark board (Stage-Dark.dc.html): Sunday Drive Pop, Am7 in Main B → Main C, running at 104. */
export const stageBoard = {
  appBar: boardAppBar,
  sectionRow: sectionRowBoard,
  display: displayBoard,
  faders: {
    strips: panelStrips,
    pageTabs: faderPageTabs,
    page: 'panel',
    layerTabs,
    layer: 'volume',
    partLamps,
    functionLamps,
  },
  knobs: { knobs: styleKnobs, pageLabel: styleKnobPage.label, count: styleKnobPage.count },
  pads: {
    pads: sectionPads,
    bankName: sectionBank.name,
    count: sectionBank.count,
    legend: sectionLegend,
    lit: true,
  },
  transport: transportBoard,
  status: { text: null },
  keys: boardKeys,
} satisfies ComponentProps<typeof Stage>

/** Stopped with a style queued, the faders on the Reverb layer, a message on the status line, nothing held. */
export const stageStopped = {
  ...stageBoard,
  display: displayStopped,
  faders: { ...stageBoard.faders, layer: 'reverb', strips: reverbStrips },
  transport: { running: false, fading: false },
  status: { text: 'Style queued: it starts at the next Start', seq: 1 },
  keys: { ...boardKeys, heldLeft: [], heldRight: [] },
} satisfies ComponentProps<typeof Stage>

/**
 * The Playground's fader values per layer: Vol has all nine strips, the other layers strips 1–4
 * (the parts). Pan is 0–127 with 64 centre.
 */
export const stageLayerValues: Record<string, number[]> = {
  volume: panelStrips.map((strip) => strip.level),
  pan: [64, 40, 88, 64],
  reverb: reverbStrips.slice(0, 4).map((strip) => strip.level),
  chorus: [12, 0, 0, 8],
  delay: [0, 0, 0, 0],
}

/** The styles the Playground's ◀ ▶ step through. */
export const stageStyles = [
  { styleName: 'Sunday Drive Pop', category: 'Pop', timeSignature: '4/4' },
  { styleName: 'Coastal Highway', category: 'Rock', timeSignature: '4/4' },
  { styleName: 'Ballad Night', category: 'Ballad', timeSignature: '4/4' },
  { styleName: 'Waltz for Two', category: 'Ballroom', timeSignature: '3/4' },
]

/** The style's own tempo, which Style tempo goes back to. */
export const stageStyleTempo = 104
