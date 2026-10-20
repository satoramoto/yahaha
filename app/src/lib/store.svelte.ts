// The stores every panel reads:
//
// - `app.state`: the latest `AppState` from the session, replaced on every change (up to
//   ~60 times a second while playing). Only a snapshot with a higher `version` than the
//   last one applied replaces it, and every part of it equal to the last one keeps the
//   last one's object (`share`), so a `$derived` slice that didn't change stays the same
//   object and nothing downstream of it re-runs.
// - `app.send(cmd)`: every action goes through here.
// - `app.library`: the style list, re-fetched when `state.library.revision` changes.
// - `app.sounds`: the sound catalog (#117), re-fetched when `state.sounds.revision` changes.
// - `clock.beats`: the engine's LED clock (lamps flash and pulse on it) and `clock.pos`:
//   the position in the section, both run on from the state's anchors every frame while
//   anything moves on them (`clockNeeded`).
// - `ui`: app-only state (overlays, theme) that the engine doesn't know about.

import { emptyState } from './api/constants'
import type { Session } from './api/session'
import type { AppCmd, AppState, ClockState, LibraryList, Meters, SoundCatalog } from './api/types'

/**
 * `next`, with every part of it that is deep-equal to the same part of `prev` replaced by
 * `prev`'s object; `prev` itself when the two are equal. Neither is changed: a part of
 * `next` holding shared parts is a copy. For plain JSON values (objects, arrays,
 * primitives), as a state snapshot is; one pass over `next`.
 */
export function share<T>(prev: unknown, next: T): T {
  if (prev === next || typeof prev !== 'object' || typeof next !== 'object' || prev === null || next === null) return next
  if (Array.isArray(prev) !== Array.isArray(next)) return next
  const p = prev as Record<string, unknown>
  const n = next as Record<string, unknown>
  const keys = Object.keys(n)
  let same = keys.length === Object.keys(p).length
  let out: Record<string, unknown> | null = null
  for (const k of keys) {
    const had = k in p
    const v = n[k]
    const s = had ? share(p[k], v) : v
    if (!had || s !== p[k]) same = false
    if (s !== v) {
      out ??= Array.isArray(n) ? (n.slice() as unknown as Record<string, unknown>) : { ...n }
      out[k] = s
    }
  }
  return (same ? prev : (out ?? n)) as T
}

class AppStore {
  state = $state.raw<AppState>(emptyState())
  library = $state.raw<LibraryList>({ revision: 0, entries: [], voices: [], harmonyTypes: [], arpPatterns: [] })
  sounds = $state.raw<SoundCatalog>({ revision: 0, entries: [], recents: [] })
  kind = $state<'mock' | 'tauri' | null>(null)
  private session: Session | null = null
  private unsub: (() => void) | null = null
  private libraryRevision = -1
  private soundsRevision = -1

  /** The version of the state last applied; older or repeated snapshots are dropped. */
  private version = -Infinity

  attach(session: Session) {
    this.detach()
    this.session = session
    this.kind = session.kind
    this.version = -Infinity
    this.soundsRevision = -1
    this.unsub = session.subscribe((s) => this.apply(s))
  }

  /**
   * Applies a snapshot only if it's newer than the last one applied. State fetches can
   * resolve out of order (two `invoke('state')` in flight), and an older snapshot must
   * never overwrite a newer one. Returns whether it was applied.
   */
  apply(s: AppState): boolean {
    if (!(s.version > this.version)) return false
    this.version = s.version
    s = share(this.state, s)
    this.state = s
    clock.sync(s)
    if (s.library.revision !== this.libraryRevision && this.session) {
      this.libraryRevision = s.library.revision
      this.session.library().then((l) => (this.library = l))
    }
    // An engine before #117 has no catalog.
    const sounds = s.sounds?.revision
    if (sounds !== undefined && sounds !== this.soundsRevision && this.session?.sounds) {
      this.soundsRevision = sounds
      this.session.sounds().then((c) => (this.sounds = c))
    }
    return true
  }

  detach() {
    this.unsub?.()
    this.unsub = null
    this.session = null
  }

  send(cmd: AppCmd) {
    this.session?.send(cmd)
  }

  /** The latest meters (levels and, #340, each track's CPU); null without a session. */
  meters(): Promise<Meters | null> {
    return this.session ? this.session.meters() : Promise.resolve(null)
  }

  /** Open (focus) or close a keyboard part's plugin editor window (the app shell's, on
   * its main thread). */
  pluginEditor(part: number, open: boolean) {
    this.session?.pluginEditor?.(part, open)
  }
}

export const app = new AppStore()

/**
 * The engine's clocks, run on between states (docs/app-api.md, "surface.clock"). A state
 * carries anchors, not a ticking position: on each one we note when it arrived, and every
 * animation frame reads
 *
 *   t   = atMs + (now − receivedMs)                       session ms, now
 *   pos = running ? max(0, sectionAnchorBeats + (t − sectionAnchorMs)·tempo/60000) : 0
 *   led = ledAnchorBeats + (t − ledAnchorMs)·tempo/60000
 *
 * - `beats`: the LED clock, free-running. Lamps flash and pulse on it, as the hardware pads do.
 * - `pos`: quarter notes into the section playing (0 stopped), for position displays.
 *
 * The frame loop runs only while `start()`ed, the page is visible and `clockNeeded` says
 * something moves on the clocks. Otherwise the values stay as last computed (and are
 * recomputed on every state), which is all a reader needs: stopped, `pos` is 0, and a
 * solid or dark lamp doesn't depend on `beats`.
 */
class BeatClock {
  beats = $state(0)
  pos = $state(0)
  private c: ClockState | null = null
  private receivedMs = 0
  private raf = 0
  private started = false
  private needed = false
  private hidden = false
  private readonly onVisibility = () => {
    this.hidden = document.visibilityState === 'hidden'
    this.update()
  }

  /** Whether the frame loop is running. */
  get looping(): boolean {
    return this.raf !== 0
  }

  sync(s: AppState) {
    this.c = s.surface?.clock ?? null
    this.receivedMs = now()
    this.needed = clockNeeded(s)
    this.tick()
    this.update()
  }

  tick() {
    const c = this.c
    if (!c) return
    const t = c.atMs + (now() - this.receivedMs)
    const perMs = c.tempo / 60000
    // Never before the section's start (a local clock a hair behind the engine's).
    this.pos = c.running ? Math.max(0, c.sectionAnchorBeats + (t - c.sectionAnchorMs) * perMs) : 0
    this.beats = c.ledAnchorBeats + (t - c.ledAnchorMs) * perMs
  }

  /** Run the frame loop whenever it's needed (App does, for its life), until `stop()`. */
  start() {
    if (this.started) return
    this.started = true
    if (typeof document !== 'undefined') {
      this.hidden = document.visibilityState === 'hidden'
      document.addEventListener('visibilitychange', this.onVisibility)
    }
    this.update()
  }

  stop() {
    if (!this.started) return
    this.started = false
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', this.onVisibility)
    this.update()
  }

  /** Start or stop the frame loop to match what's needed now. */
  private update() {
    const want = this.started && this.needed && !this.hidden
    if (want && !this.raf && typeof requestAnimationFrame !== 'undefined') {
      const loop = () => {
        this.tick()
        this.raf = requestAnimationFrame(loop)
      }
      this.tick()
      this.raf = requestAnimationFrame(loop)
    } else if (!want && this.raf) {
      cancelAnimationFrame(this.raf)
      this.raf = 0
      this.tick()
    }
  }
}

/**
 * Whether anything on screen moves on the clocks, so the frame loop must run:
 * - the band is playing (`pos` runs; position displays and the chart follow it);
 * - a lamp the engine sends flashes or pulses (any `anim` 'flash'/'pulse' not off, or a
 *   palette pad's `mode` 'flash'/'pulse', which may flash to its second colour even when
 *   off: pads, section lamps, the surface's buttons);
 * - a lamp the app draws flashes or pulses: Quick Rack Store armed, a Multi Pad armed or
 *   queued, the Chord Looper armed, a style queued for preview, a scan running.
 * One pass over the state, on each state.
 */
export function clockNeeded(s: AppState): boolean {
  if (s.transport?.running || s.surface?.clock?.running) return true
  if (s.quickRacks?.store) return true
  if (s.multiPad?.pads.some((p) => p.lamp === 'armed' || p.lamp === 'queued')) return true
  if (s.looper?.mode === 'recArmed' || s.looper?.mode === 'loopArmed') return true
  if (s.preview?.queued != null) return true
  if (s.library?.scanning || s.sounds?.scanning || s.plugins?.scanning) return true
  return animates(s)
}

function animates(v: unknown): boolean {
  if (typeof v !== 'object' || v === null) return false
  if (Array.isArray(v)) return v.some(animates)
  const o = v as Record<string, unknown>
  if ((o.anim === 'flash' || o.anim === 'pulse') && o.level !== 'off') return true
  if (o.mode === 'flash' || o.mode === 'pulse') return true
  for (const k in o) if (animates(o[k])) return true
  return false
}

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now())

export const clock = new BeatClock()

/** The theme chosen: dark, light, or `system` (follow the computer's `prefers-color-scheme`). */
export type Theme = 'dark' | 'light' | 'system'

function storedTheme(): Theme {
  try {
    const t = localStorage.getItem('yahaha.theme')
    return t === 'light' || t === 'system' ? t : 'dark'
  } catch {
    return 'dark'
  }
}

/** Whether the computer asks for dark (`prefers-color-scheme`); dark where it can't tell. */
function systemDark(): boolean {
  if (typeof matchMedia === 'undefined') return true
  return !matchMedia('(prefers-color-scheme: light)').matches
}

function storedFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

function storeFlag(key: string, on: boolean) {
  try {
    localStorage.setItem(key, on ? '1' : '0')
  } catch {
    /* private window: not remembered */
  }
}

/** Keys on the keyboard strip: the Launchkey 49 or 61, or a full 88. */
export type KeyRange = 49 | 61 | 88

function storedKeyRange(): KeyRange | null {
  try {
    const n = Number(localStorage.getItem('yahaha.keys'))
    return n === 49 || n === 61 || n === 88 ? n : null
  } catch {
    return null
  }
}

/** A sound picked for a program map rule (`SoundPicker`). */
export interface SoundPick {
  /** "Piano family", "Drum rule". */
  title: string
  /** The library patch it names now (null: none). */
  value: string | null
  /** Gets the catalog id picked. */
  onpick: (id: string) => void
}

/** The top-level page under the header (docs/racks.md, "Screens"): the stage, Library, or the Rack. */
export type View = 'stage' | 'library' | 'rack'

/** A keyboard part, as the library's sound row names it (ui/SoundRow); `PART_IDS[i]` is
 * the commands' `part` i. */
export type PartId = 'right1' | 'right2' | 'right3' | 'left'
export const PART_IDS: readonly PartId[] = ['right1', 'right2', 'right3', 'left']

/** The quick sound list open for a keyboard part (panels/sounds/SoundPick), anchored under the
 * control that opened it (null: no anchor, centred). */
export interface SoundList {
  part: PartId
  anchor: DOMRect | null
}

/** Library's tabs. */
export type LibraryTab = 'styles' | 'racks' | 'sounds' | 'instruments' | 'map'

class UiStore {
  /** The page in the main slot: Stage | Library (the header's switch, Alt+B) | Rack (Alt+O).
   * Settings opens over any of them. */
  view = $state<View>('stage')
  /** The Stage is zen's (panels/zen/ZenStageScreen) instead of the app's own (panels/stage/StageScreen):
   * the `?zen` URL parameter, until zen's Stage has page and side slots. */
  zenStage = $state(false)
  /** Library's tab, kept while it's closed. */
  libraryTab = $state<LibraryTab>('sounds')
  /** The keyboard part (0-3) Library's Sounds and Instruments load into: "Loads into". */
  libraryPart = $state(0)
  /** Settings, over whichever page is shown. */
  settings = $state(false)
  /** Pop-up tips in help mode: the hovered control's entry also floats next to it
   * (Stage-Help, `app.floating_tips`). Off by default. */
  floatingTips = $state(storedFlag('yahaha.floatingTips'))
  /** The first-run panel has been put away (the player started the band or chose a style);
   * remembered on this computer. */
  firstRunDone = $state(storedFlag('yahaha.firstRunDone'))
  /** The quick sound list open for a part (panels/sounds/SoundPick); null: closed. */
  soundList = $state.raw<SoundList | null>(null)
  /** Whether the computer asks for dark, kept up by `watchSystemTheme`. */
  systemDark = $state(systemDark())

  /** The Rack page (docs/racks.md): `view === 'rack'`. Setting it shows the Rack page, or,
   * when off, goes back to the Stage if the Rack was showing. */
  get rack(): boolean {
    return this.view === 'rack'
  }
  set rack(on: boolean) {
    if (on) this.view = 'rack'
    else if (this.view === 'rack') this.view = 'stage'
  }
  /** The part the Channel page shows: 0–3 the keyboard parts (Right 1–3, Left), 4–11 the
   * Style parts (Rhythm 1 … Phrase 2). */
  selectedPart = $state(0)
  /** The sound picker for a program map rule (Library › Style map, #117): what for, the
   * patch it names now, and where the pick goes. Null: not picking. */
  soundPick = $state.raw<SoundPick | null>(null)
  theme = $state<Theme>(storedTheme())
  /** The keyboard strip's size; null: match the connected Launchkey (49 or 61). */
  keyRange = $state<KeyRange | null>(storedKeyRange())
  /** The Launchkey mirror's Shift layer: latched on screen, or the Shift key held. */
  shiftLatched = $state(false)
  shiftHeld = $state(false)

  get shift(): boolean {
    return this.shiftLatched || this.shiftHeld
  }

  /** Show the Rack page or Settings (closing the other), or close it if it's open. */
  toggleDrawer(d: 'rack' | 'settings') {
    const open = !this[d]
    this.rack = this.settings = false
    this[d] = open
  }

  /** The page to go back to once a rack prompt that opened the Rack page is answered (App
   * does); null: none pending. Goes when PromptHost asks the prompts. */
  promptReturn = $state<{ view: View; settings: boolean } | null>(null)

  /** A rack prompt appeared: show the Rack page, where it is asked, remembering where we were. */
  openRackForPrompt() {
    if (this.view === 'rack') return
    this.promptReturn = { view: this.view, settings: this.settings }
    this.settings = false
    this.view = 'rack'
  }

  /** The prompt was answered: back to where it was asked from, if the Rack page is still showing. */
  promptAnswered() {
    const r = this.promptReturn
    this.promptReturn = null
    if (r && this.view === 'rack') {
      this.view = r.view
      this.settings = r.settings
    }
  }

  /** Show Library, on `tab` (else the last one) and loading into `part` (else the last one). */
  openLibrary(tab?: LibraryTab, part?: number) {
    if (tab) this.libraryTab = tab
    if (part !== undefined) this.libraryPart = Math.max(0, Math.min(3, part))
    this.view = 'library'
  }

  setTheme(t: Theme) {
    this.theme = t
    try {
      localStorage.setItem('yahaha.theme', t)
    } catch {
      /* private window: the theme just isn't remembered */
    }
  }

  /** The theme to draw in: `system` resolved through `prefers-color-scheme`. Every
   * `data-theme` reads this, never `theme`. */
  get resolvedTheme(): 'dark' | 'light' {
    if (this.theme !== 'system') return this.theme
    return this.systemDark ? 'dark' : 'light'
  }

  /** Follow the computer's light/dark setting while it lasts (App does, for its life).
   * Returns the stop function. */
  watchSystemTheme(): () => void {
    if (typeof matchMedia === 'undefined') return () => {}
    const q = matchMedia('(prefers-color-scheme: light)')
    const on = () => (this.systemDark = !q.matches)
    on()
    q.addEventListener?.('change', on)
    return () => q.removeEventListener?.('change', on)
  }

  setFloatingTips(on: boolean) {
    this.floatingTips = on
    storeFlag('yahaha.floatingTips', on)
  }

  setFirstRunDone(done: boolean) {
    this.firstRunDone = done
    storeFlag('yahaha.firstRunDone', done)
  }

  setKeyRange(k: KeyRange | null) {
    this.keyRange = k
    try {
      if (k) localStorage.setItem('yahaha.keys', String(k))
      else localStorage.removeItem('yahaha.keys')
    } catch {
      /* not remembered */
    }
  }

  /** Esc: close the topmost overlay. Returns whether anything closed. */
  escape(): boolean {
    if (this.soundList !== null) {
      this.soundList = null
      return true
    }
    if (this.soundPick !== null) {
      this.soundPick = null
      return true
    }
    if (this.settings) return !(this.settings = false)
    // Library and the Rack are pages, not overlays: Esc goes back to Stage once nothing is open over them.
    if (this.view !== 'stage') {
      this.view = 'stage'
      return true
    }
    return false
  }
}

export const ui = new UiStore()
