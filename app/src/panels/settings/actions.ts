// What the Settings screen's pages do: each page's change (ui/Settings/types.ts) as the command
// the old drawer's page sends for it (ChordPage, SplitPage, TransposePage, LockPage, StylePage,
// ChangeBehavior, PedalsPage, AudioPage, MidiPage, LibraryPage, LaunchkeyPage in this folder).
// Pure of Svelte: SettingsScreen.svelte passes the stores in as `SettingsDeps`, tests pass fakes.

import { functionInfo } from '../../lib/api/assignable'
import { settings, type SettingsCmd } from '../../lib/api/settings.svelte'
import { DEFAULT_PAD_PAGES, type AppCmd, type AppState, type PadPage, type PedalState } from '../../lib/api/types'
import type {
  ChordChange,
  KeyboardChange,
  LaunchkeyChange,
  PedalsChange,
  SettingsPageId,
  StyleChange,
  SystemChange,
} from '../../ui/Settings/types'
import { BUFFERS, DEFAULT_SPLIT } from './model'

export interface SettingsDeps {
  /** The latest state. */
  state: () => AppState
  send: (cmd: AppCmd) => void
  /** The settings adapter's `send` (lib/api/settings.svelte.ts): drops what the engine lacks. */
  settingsSend: (cmd: SettingsCmd) => void
  /** `ui.setTheme`. */
  setTheme: (theme: 'dark' | 'light') => void
  /** Show another Settings page. */
  openPage: (page: SettingsPageId) => void
  /** Arm or disarm the split pick on the main keyboard (`splitPick.armed`, ../stage/splitPick.svelte.ts). */
  arm: (armed: boolean) => void
}

export interface SettingsActions {
  onchord: (c: ChordChange) => void
  onstyle: (c: StyleChange) => void
  onkeyboard: (c: KeyboardChange) => void
  onpedals: (c: PedalsChange) => void
  onsystem: (c: SystemChange) => void
  onlaunchkey: (c: LaunchkeyChange) => void
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

export function settingsActions(d: SettingsDeps): SettingsActions {
  const s = () => d.state()

  /** A toggle command, sent only when the wanted value isn't the state's already. */
  const toggle = (now: boolean, want: boolean, cmd: AppCmd) => {
    if (now !== want) d.send(cmd)
  }

  function onchord(c: ChordChange) {
    const chord = s().chord
    switch (c.type) {
      case 'fingering':
        if (c.id !== chord.fingering) d.send({ type: 'setFingering', fingering: c.id as AppState['chord']['fingering'] })
        return
      case 'upper':
        return d.send({ type: 'setUpper', on: c.on })
      case 'manualBass':
        // Manual Bass works only with Upper on.
        if (chord.upper) d.send({ type: 'setManualBass', on: c.on })
        return
      case 'leftHold':
        return d.send({ type: 'setLeftHold', on: c.on })
      case 'settle':
        return d.send({ type: 'setChordSettle', ms: c.ms })
      case 'splitStep':
        return d.send({ type: 'moveSplit', delta: c.delta })
      case 'pick':
        // A locked split point can't be picked on the keys (the − + steppers still move it).
        return d.arm(c.armed && !s().paramLocks.splitPoint)
      case 'splitReset':
        return d.send({ type: 'setSplit', note: DEFAULT_SPLIT })
      case 'openKeyboard':
        return d.openPage('keyboard')
    }
  }

  function onstyle(c: StyleChange) {
    const st = s()
    const t = st.transport
    const dyn = st.dynamics
    switch (c.key) {
      case 'mainTiming':
        return d.send({ type: 'setMainTiming', timing: c.value })
      case 'introEndingTiming':
        return d.send({ type: 'setIntroEndingTiming', timing: c.value })
      case 'otsLinkTiming':
        return d.send({ type: 'setOtsLinkTiming', timing: c.value })
      case 'stopAcmp':
        return d.send({ type: 'setStopAcmp', mode: c.value })
      case 'tempoChange':
        return d.send({ type: 'setTempoChange', rule: c.value })
      case 'partsChange':
        return d.send({ type: 'setPartsChange', rule: c.value })
      case 'sectionSet':
        return d.send({ type: 'setSectionSet', section: c.value })
      case 'sectionReset':
        return d.send({ type: 'setSectionReset', on: c.value })
      case 'syncStopWindowMs':
        return d.send({ type: 'setSyncStopWindow', ms: c.value })
      case 'fadeInMs':
        return d.send({ type: 'setFadeInTime', ms: c.value })
      case 'fadeOutMs':
        return d.send({ type: 'setFadeOutTime', ms: c.value })
      case 'fadeHoldMs':
        return d.send({ type: 'setFadeHoldTime', ms: c.value })
      case 'retrigger':
        return toggle(t.retrigger, c.value, { type: 'toggleRetrigger' })
      case 'retriggerRate':
        return d.send({ type: 'setRetriggerRate', rate: c.value })
      case 'swing':
        return d.send({ type: 'setSwing', amount: c.value })
      case 'swingGrid':
        return d.send({ type: 'setSwingGrid', grid: c.value })
      case 'sectionTempo':
        return d.send({ type: 'setSectionTempo', on: c.value })
      case 'syncStop':
        if (t.syncStopAvailable) toggle(t.syncStop, c.value, { type: 'toggleSyncStop' })
        return
      case 'syncStopAvailable':
        return
      case 'autoFill':
        return toggle(t.autoFill, c.value, { type: 'toggleAutoFill' })
      case 'halfBarFill':
        return toggle(t.halfBarFill, c.value, { type: 'toggleHalfBarFill' })
      case 'unison':
        return toggle(t.unisonLatched, c.value, { type: 'toggleUnison' })
      case 'unisonType':
        return d.send({ type: 'setUnisonType', unisonType: c.value })
      case 'dynamicsControl':
        return d.send({ type: 'setDynamicsControl', on: c.value })
      case 'dynamicsLevel':
        return d.send({ type: 'setDynamics', level: c.value })
      case 'touch':
        return toggle(dyn.touch, c.value, { type: 'toggleDynamicsTouch' })
      case 'accent':
        return toggle(dyn.accent, c.value, { type: 'toggleAccent' })
      case 'accentThreshold':
        return d.send({ type: 'setAccentThreshold', velocity: Math.max(1, c.value) })
      case 'accentMode':
        return d.send({ type: 'setAccentMode', mode: c.value })
      case 'accentSource':
        return d.send({ type: 'setAccentSource', source: c.value })
    }
  }

  function onkeyboard(c: KeyboardChange) {
    switch (c.type) {
      case 'keyboardStep':
        return d.send({ type: 'stepTranspose', keyboard: c.delta, master: 0 })
      case 'masterStep':
        return d.send({ type: 'stepTranspose', keyboard: 0, master: c.delta })
      case 'reset':
        return d.send({ type: 'resetTranspose' })
      case 'lock':
        return d.send({ type: 'setParamLock', item: c.item, on: c.on })
    }
  }

  /** The whole pedal, from the state, with the change: `setPedal` sets every field. */
  function setPedal(i: number, change: Partial<PedalState>) {
    const now = s().controllers.pedals[i]
    if (!now) return
    const p = { ...now, ...change }
    d.send({ type: 'setPedal', pedal: i, cc: p.cc, function: p.function, controlType: p.controlType, reverse: p.reverse, range: p.range })
  }

  function onpedals(c: PedalsChange) {
    const ctl = s().controllers
    switch (c.type) {
      case 'cc':
        return setPedal(c.pedal, { cc: c.cc === null ? null : clamp(Math.round(c.cc), 0, 127) })
      case 'function':
        return setPedal(c.pedal, { function: c.fn as PedalState['function'] })
      case 'controlType':
        return setPedal(c.pedal, { controlType: c.value })
      case 'reverse':
        return setPedal(c.pedal, { reverse: c.on })
      case 'range':
        return setPedal(c.pedal, { range: c.value })
      case 'learn':
        return d.send({ type: 'learnPedal', pedal: ctl.learning === c.pedal ? null : c.pedal })
      case 'try': {
        // As the old page's Try: nothing for no function, an expression pedal or one yahaha lacks.
        const fn = ctl.pedals[c.pedal]?.function
        const info = fn ? functionInfo(fn) : undefined
        if (!fn || fn === 'none' || info?.kind === 'continuous' || info?.available === false) return
        return d.send({ type: 'triggerFunction', function: fn })
      }
      case 'reach': {
        const part = ctl.parts[c.part]
        if (!part) return
        const p = { ...part, [c.controller]: c.on }
        return d.send({ type: 'setPartControllers', part: c.part, sustain: p.sustain, pitchBend: p.pitchBend, modulation: p.modulation })
      }
      case 'bendStep': {
        const part = ctl.parts[c.part]
        if (!part) return
        return d.send({ type: 'setBendRange', part: c.part, semitones: clamp(part.bendRange + c.delta, 0, 12) })
      }
    }
  }

  function onsystem(c: SystemChange) {
    const st = s()
    const synth = st.io.synth
    switch (c.type) {
      case 'synth':
        // `setSynthMuted` says muted: on is the opposite.
        if (synth) d.send({ type: 'setSynthMuted', on: !c.on })
        return
      case 'outputPair':
        // The page counts channels from 1; the command from 0.
        return d.send({ type: 'setAudioOutput', first: c.first - 1 })
      case 'buffer': {
        const frames = BUFFERS.find((b) => b === c.frames)
        if (frames) d.send({ type: 'setAudioBuffer', frames })
        return
      }
      case 'master':
        return d.send({ type: 'setMasterVolume', volume: c.volume })
      case 'allInputs': {
        const names = settings.view(st).sources.filter((x) => x.listening).map((x) => x.name)
        return d.settingsSend({ type: 'setMidiInputs', all: c.all, names })
      }
      case 'input': {
        // Switching one source in "All" moves to "Selected" with every other source as it is.
        const on = settings.view(st).sources.filter((x) => x.listening).map((x) => x.name)
        const names = c.on ? (on.includes(c.name) ? on : [...on, c.name]) : on.filter((n) => n !== c.name)
        return d.settingsSend({ type: 'setMidiInputs', all: false, names })
      }
      case 'paletteLeds':
        return d.settingsSend({ type: 'setPaletteLeds', on: c.on })
      case 'rescan':
        return d.settingsSend({ type: 'rescanLibrary' })
      case 'theme':
        return d.setTheme(c.theme)
    }
  }

  function onlaunchkey(c: LaunchkeyChange) {
    const order = s().settings.padPages
    const send = (pages: PadPage[]) => d.send({ type: 'setPadPageOrder', pages })
    switch (c.type) {
      case 'move': {
        const i = order.indexOf(c.id as PadPage)
        const j = i + c.delta
        if (i < 0 || j < 0 || j >= order.length) return
        const pages = [...order]
        ;[pages[i], pages[j]] = [pages[j], pages[i]]
        return send(pages)
      }
      case 'shown': {
        const id = c.id as PadPage
        const has = order.includes(id)
        if (c.on && !has && DEFAULT_PAD_PAGES.includes(id)) return send([...order, id])
        if (!c.on && has) return send(order.filter((p) => p !== id))
        return
      }
      case 'reset':
        return send([...DEFAULT_PAD_PAGES])
    }
  }

  return { onchord, onstyle, onkeyboard, onpedals, onsystem, onlaunchkey }
}
