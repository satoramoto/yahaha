/** A keyboard part's hue. */
export type PartHue = 'r1' | 'r2' | 'r3' | 'l'

/** A section's hue (the compact block's playing section). */
export type SectionHue = 'intro' | 'main' | 'ending' | 'brk' | 'fill'

/** The compact block at the top left: style, tempo, running, chord, the playing section. */
export type RackNow = {
  style: string
  bpm: number
  running: boolean
  /** The chord's root and quality ("Am"), and its extension ("7"); empty: no chord. */
  chord: string
  extension: string
  /** The chord's notes ("A C E G"). */
  notes: string
  /** The playing section's shown name ("Main B"). */
  section: string
  hue: SectionHue
}

/** The rack's keyboard settings (the left column). */
export type RackKeyboard = {
  /** The split point's name ("F#2"). */
  split: string
  /** The keyboard transpose in semitones. */
  transpose: number
  harmonyOn: boolean
  /** The Harmony type or Arp pattern's name. */
  harmonyType: string
  manualBass: boolean
  /** Manual Bass works only with Upper chord detection: otherwise shown dimmed. */
  manualBassEnabled: boolean
  leftHold: boolean
  /** The Quick Rack the live rack is on ("A1"); empty: none. */
  quickRack: string
  /** Quick Rack Store armed. */
  store: boolean
}

/** The page head: which rack, whether it changed, saving it. */
export type RackHead = {
  name: string
  /** One of the user's racks (not new): "Mine". */
  mine: boolean
  modified: boolean
  /** Save does something: modified, or a rack never saved. */
  canSave: boolean
  /** Revert does something: modified and saved once. */
  canRevert: boolean
  /** The name Save as… starts from. */
  saveAsName: string
}

/** What plays a part: a plugin (its Edit, Reload or Save sound, In process), a missing plugin
 * (Replace…), or none (a SoundFont voice). */
export type PluginKind = 'none' | 'plugin' | 'missing'

/** One keyboard part's row of the parts table. Values are 0-127 unless said. */
export type RackHand = {
  /** "R1". */
  tag: string
  /** "Right 1". */
  name: string
  hue: PartHue
  /** The sound's number in the library; empty: none. */
  number: string
  sound: string
  /** What plays it ("Sampler Deluxe · Strings"). */
  instrument: string
  edited: boolean
  missing: boolean
  /** Sounding. */
  on: boolean
  /** The On lamp's word when on: "On", or "Bass" while it plays the style's bass. */
  onWord: string
  level: number
  /** 0-127, 64 centre. */
  pan: number
  reverb: number
  chorus: number
  delay: number
  /** Sends 4-6 in a few words ("0 · —"). */
  sends: string
  sendsAria: string
  /** −2…2. */
  octave: number
  /** Insert 1's name ("None", "Tremolo"), and its amount ("30"; empty: none). */
  insert: string
  insertAmount: string
  plugin: PluginKind
  /** The plugin has an editor window. */
  canEdit: boolean
  /** The plugin's name, for Edit's accessible name. */
  pluginName: string
  inProcess: boolean
  canInProcess: boolean
}

/** The Controller map group's summary. */
export type RackMapSummary = {
  /** Differs from the default map. */
  edited: boolean
  /** "Right 1 · Right 2 · Right 3 · Left". */
  faders: string
  knobs: string
}

/** One send effect in the rack's Send effects group. */
export type RackSend = {
  /** 0-based: 0-2 the style's, 3-5 added. */
  send: number
  /** "Reverb", "Phaser". */
  role: string
  /** The type or where it comes from ("from style", "Celeste", "added"). */
  note: string
  /** Sends 1-3: the rack keeps their type. */
  keep: boolean
}

/** The One Touch group, for the loaded style. */
export type RackOneTouch = {
  style: string
  /** OTS 1-4: its name and, when one of your racks, that rack's name. */
  slots: { name: string; rack: string }[]
  /** 1-4; 0 none applied. */
  applied: number
  link: boolean
  timing: 'immediate' | 'mainChange'
}
