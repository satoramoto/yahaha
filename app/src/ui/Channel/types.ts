/**
 * The Channel page's data and changes (docs/specs/push/Channel.md, fitted to the Stage's display
 * box): one part's channel, its group tabs and the parts list. The library's Channel components
 * take these as props and report changes as these values; the app's wiring (panels/channel) builds
 * the data from the engine's state and turns each change into a command. No API types here: the
 * library imports nothing from the app.
 */

/** A keyboard part's hue; a Style part has none (`null`: it draws in the neutral ink). */
export type PartHue = 'r1' | 'r2' | 'r3' | 'l'

/** The page's group tabs, in order. */
export type ChannelTab = 'mix' | 'eqTone' | 'comp' | 'inserts'

/** One entry of the parts list (parts 0–11: Right 1, Right 2, Right 3, Left, then the Style parts). */
export interface PartEntry {
  /** "R1", "R2", "R3", "L", "Rhythm 1" … "Phrase 2". */
  tag: string
  /** A keyboard part's sound name ("Stage Grand"); empty for a Style part. */
  name: string
  /** The part's hue; null for a Style part. */
  hue: PartHue | null
  /** It doesn't sound (keyboard: `sounding` false; Style: `on` false). */
  off: boolean
}

/** How a bar readout shows its value (BarReadout `kind`). */
export type BarKind = 'number' | 'db' | 'ms' | 'hz' | 'pan' | 'offset' | 'ratio' | 'display'

/** The plugin a keyboard part plays, as its sound line shows it. */
export interface PluginLine {
  /** "Sampler Deluxe". */
  name: string
  status: 'loading' | 'playing' | 'failed' | 'muted'
  /** Not installed: the status reads "missing". */
  missing: boolean
  /** It runs inside yahaha's process ("in process"). */
  inProcess: boolean
  /** In process only because its own process was refused (the ⚠). */
  fallback: boolean
  /** Its editor window can be opened (the Edit button). */
  editor: boolean
}

/** The open part's sound (the Mix tab's Sound group). */
export interface ChannelSound {
  /** The patch number in the library ("1"), or empty. */
  number: string
  /** "Stage Grand"; a Style part: its voice's label ("≈ Strings [Yamaha 104/0/49]"), or empty. */
  name: string
  /** The sound was edited since it was loaded (the dot). */
  edited: boolean
  /** Its plugin is missing (⚠). */
  missing: boolean
  /** Its plugin failed (✕). */
  failed: boolean
  /** The part is off and silent ("off"). */
  off: boolean
  /** Left plays the Style's bass under Manual Bass ("bass"). */
  bass: boolean
  /** One of the user's own library sounds ("Mine"). */
  mine: boolean
  /** Its plugin; null: a SoundFont voice. */
  plugin: PluginLine | null
}

/** The Mix tab's Level group. */
export interface ChannelMix {
  /** CC 7, 0–127. */
  level: number
  /** The hardware fader hasn't reached `level` yet (soft takeover): "Level ↕". */
  waiting: boolean
  /** Pan 0–127, 64 centre; null: a Style part (no pan). */
  pan: number | null
  /** The part is on (its lamp lit). */
  on: boolean
  /** The lamp's word: "On" / "Off", or "Swap" while this part's swap is held. */
  onLabel: string
  /** Long press on On holds swap (keyboard parts only). */
  canSwap: boolean
  /** This part is soloed. */
  solo: boolean
}

/** One send row, sends 1–6. */
export interface ChannelSendRow {
  /** 0–5. */
  send: number
  /** "Reverb", "Chorus", "Delay", then the added send's kind name ("Phaser"); "Send 5" when not there. */
  label: string
  /** The strip's level to it, 0–127. */
  level: number
  /** The send effect exists. */
  present: boolean
  /** A Style part's sends 1–3: "style" (the style's CC 91/93/94 as it plays) or "yours" (set by
   * the player); absent for a keyboard part and sends 4–6. */
  mark?: 'style' | 'yours'
}

/** A Style part's voice as the style wrote it (in place of Tone). */
export interface ChannelStyleVoice {
  bankMsb: number
  bankLsb: number
  program: number
  /** A drum kit (true) or an instrument. */
  kit: boolean
  /** The MIDI channel, 9–16. */
  channel: number
}

/** One band send scale (Effects' `bandSend`), sends 1–3 (in place of Play for a Style part). */
export interface ChannelBandScale {
  /** "Reverb", "Chorus", "Delay". */
  label: string
  /** 0–127 %, 100 = as the style wrote it. */
  level: number
  /** This part's send is the player's own ("yours"): the scale doesn't apply to it. */
  yours: boolean
}

/** A send effect kind + Add send offers. */
export interface SendKindItem {
  kind: string
  /** "Hall". */
  name: string
}

/** The EQ: low and high shelf gain (dB, −12..12) and frequency (Hz). */
export interface ChannelEq {
  lowGain: number
  lowFreq: number
  highGain: number
  highFreq: number
}

/** A tone control's id (the strip's voice settings). */
export type ToneId = 'cutoff' | 'resonance' | 'attack' | 'decay' | 'release' | 'vibratoRate' | 'vibratoDepth' | 'vibratoDelay'

/** The Play group (keyboard parts). */
export interface ChannelPlay {
  mono: boolean
  portamento: { on: boolean; time: number }
  /** −2..2. */
  octave: number
  /** Pitch Bend Range, 0–12 semitones; null when there's none. */
  bend: number | null
}

/** A compressor type (`setStripCompressorPreset`). */
export type CompPresetId = 'natural' | 'rich' | 'punchy' | 'electronic' | 'loud'

/** A compressor parameter (`setStripCompressorParam`). */
export type CompParamId = 'threshold' | 'ratio' | 'attack' | 'release' | 'makeup'

/** The strip compressor. */
export interface ChannelComp {
  on: boolean
  preset: CompPresetId
  /** dB −48..0. */
  threshold: number
  /** Tenths, 10–200. */
  ratio: number
  /** ms 1–100. */
  attack: number
  /** ms 10–1000. */
  release: number
  /** dB 0–24. */
  makeup: number
  /** The parameters differ from the type's. */
  edited: boolean
}

/** One insert setting. */
export interface InsertSetting {
  /** "Depth". */
  name: string
  value: number
  min: number
  max: number
  /** Its kind's starting value (double-click). */
  default: number
  /** As the state gives it: "64", "0.50 Hz", "1/8". */
  display: string
}

/** One insert slot. */
export interface ChannelInsert {
  /** "none", "rotary", or a newer build's own name. */
  kind: string
  /** "Rotary"; "None" for an empty slot. */
  name: string
  on: boolean
  settings: InsertSetting[]
}

/** An insert kind the slot's choice offers. */
export interface InsertKindItem {
  kind: string
  name: string
}

/** Everything the Channel page shows. */
export interface ChannelData {
  /** The open part, 0–11. */
  part: number
  /** The twelve parts, in order. */
  parts: PartEntry[]
  /** A keyboard part (0–3); false: a Style part. */
  keyboard: boolean
  /** "Right 1", "Rhythm 1". */
  partName: string
  /** The open part's hue; null for a Style part. */
  hue: PartHue | null
  /** The chosen group tab. */
  tab: ChannelTab
  /** The tags of the parts before and after (◀ ▶ names). */
  prevTag: string
  nextTag: string
  /** The part's share of the audio buffer, 0–1; null without a synth. */
  cpu: number | null
  sound: ChannelSound
  mix: ChannelMix
  sends: ChannelSendRow[]
  /** Kinds + Add send offers; empty when six sends exist. */
  sendKinds: SendKindItem[]
  eq: ChannelEq
  /** The tone offsets, 0–127 (64 = the voice's own); null for a Style part. */
  tone: Record<ToneId, number> | null
  /** null for a Style part. */
  play: ChannelPlay | null
  comp: ChannelComp
  /** Insert 1 and insert 2 (a Style part's slot 1 is the style's insert). */
  inserts: ChannelInsert[]
  insertKinds: InsertKindItem[]
  /** The rotary speed for every part (global). */
  rotaryFast: boolean
  /** A Style part's voice; null or absent for a keyboard part or a part with no voice. */
  styleVoice?: ChannelStyleVoice | null
  /** A Style part's band send scales, sends 1–3; null or absent for a keyboard part. */
  bandScale?: ChannelBandScale[] | null
}

/** A change on the Channel page; the wiring turns each into its command. */
export type ChannelChange =
  | { type: 'level'; value: number }
  | { type: 'pan'; value: number }
  | { type: 'on' }
  | { type: 'swap' }
  | { type: 'solo' }
  | { type: 'send'; send: number; value: number }
  | { type: 'addSend'; kind: string }
  /** A Style part's sends 1–3 back to the style's ("Reset to style"). */
  | { type: 'resetSends' }
  | { type: 'eq'; field: keyof ChannelEq; value: number }
  | { type: 'tone'; control: ToneId; value: number }
  | { type: 'mono' }
  /** Portamento on or off; the strip keeps its time. */
  | { type: 'portamentoOn' }
  /** The portamento time (0–127); the switch stays as it is. */
  | { type: 'portamento'; time: number }
  | { type: 'octave'; step: -1 | 1 }
  | { type: 'bend'; step: -1 | 1 }
  | { type: 'compOn' }
  | { type: 'compPreset'; preset: CompPresetId }
  | { type: 'compParam'; param: CompParamId; value: number }
  | { type: 'insertKind'; slot: number; kind: string }
  | { type: 'insertOn'; slot: number }
  | { type: 'insertSetting'; slot: number; setting: number; value: number }
  | { type: 'rotaryFast' }
