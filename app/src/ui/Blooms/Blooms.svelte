<!--
  Blooms: a few soft coloured glows behind a whole screen (the Stage, Library, Settings) that
  breathe with the band. Purely decorative and cheap: each bloom is a radial gradient painted once;
  only its `transform` and `opacity` animate (Web Animations, on the compositor), so a breath
  repaints nothing. No frame loop: while playing, the breaths are phase-locked to the clock
  (`beat`), one per `barsPerBreath` bars, re-checked every few seconds; the overall `level` lifts the
  whole backdrop's opacity a little, at most twice a second, through a slow CSS transition. Stopped,
  the breaths hold still and the backdrop settles to a calm, dimmer rest. Under
  `prefers-reduced-motion` nothing moves.

  It fills its positioned parent and never clips: the blooms near the edges run on past the box
  (the screen's scaler clips them), so no edge shows. The theme sets the strength (--bloom-peak,
  tokens/blooms.css: subtle in dark, much fainter in light); contrast.test.ts checks every text role
  on the worst spot. The screen above it must not paint its own ground (--backdrop-ground).
-->
<script lang="ts">
  import { untrack } from 'svelte'
  import {
    EXHALE,
    MOTION,
    PLAY_LOUD,
    PLAY_QUIET,
    REST,
    SPOTS,
    breathMs,
    gradient,
    hues,
    phaseMs,
    type BloomMotion,
    type BloomPalette,
    type BloomSection,
  } from './blooms'

  type Props = {
    /** Which hues: `aurora` (the accent with blue, teal and plum), `parts` (the accent and the four part hues) or `section` (the accent and the playing section's hue). */
    palette?: BloomPalette
    /** The playing section's family, for the `section` palette. */
    section?: BloomSection
    /** How far the blooms swell and drift while playing. */
    motion?: BloomMotion
    /** The band is playing: the blooms breathe. Stopped, they settle and hold still. */
    playing?: boolean
    /** The tempo, in BPM. */
    bpm?: number
    /** Beats in a bar. */
    beatsPerBar?: number
    /** Bars per breath. */
    barsPerBreath?: number
    /** The overall level, 0 to 1 (`levelOf` the master RMS); lifts the blooms a little. */
    level?: number
    /** Reads the clock's position in beats, to phase-lock the breaths; called a few times a minute, never per frame. */
    beat?: () => number | undefined
  }

  let {
    palette = 'aurora',
    section = 'main',
    motion = 'calm',
    playing = false,
    bpm = 120,
    beatsPerBar = 4,
    barsPerBreath = 4,
    level = 0.5,
    beat,
  }: Props = $props()

  /** How often a playing backdrop re-checks its phase against the clock. */
  const SYNC_MS = 4000
  /** The most often the level changes the backdrop's opacity. */
  const LEVEL_MS = 500
  /** A phase drift smaller than this fraction of a breath is left alone. */
  const DRIFT = 0.02

  const colours = $derived(hues(palette, section))
  const spots = $derived(SPOTS.slice(0, colours.length))

  // The level, held: it moves the opacity only in steps of 0.15 and at most every LEVEL_MS.
  let held = $state(0.5)
  let heldAt = 0
  $effect(() => {
    const l = Math.min(1, Math.max(0, level))
    if (Math.abs(l - untrack(() => held)) < 0.15) return
    const take = () => {
      held = l
      heldAt = performance.now()
    }
    const wait = heldAt + LEVEL_MS - performance.now()
    if (wait <= 0) return take()
    // Too soon: take this level when the half second is up, unless a newer one comes first.
    const t = setTimeout(take, wait)
    return () => clearTimeout(t)
  })

  let reduced = $state(false)
  $effect(() => {
    const mq = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null
    if (!mq) return
    reduced = mq.matches
    const on = () => (reduced = mq.matches)
    mq.addEventListener?.('change', on)
    return () => mq.removeEventListener?.('change', on)
  })

  const opacity = $derived(playing && !reduced ? PLAY_QUIET + (PLAY_LOUD - PLAY_QUIET) * held : REST)

  // ── The breaths: one swell and one drift animation per bloom, on the compositor.
  let swells: HTMLElement[] = $state([])
  let drifts: HTMLElement[] = $state([])
  let animations: Animation[] = $state.raw([])

  $effect(() => {
    const m = MOTION[motion]
    const els = spots.map((_, i) => [swells[i], drifts[i]] as const)
    if (reduced || els.some(([a, b]) => !a || !b || typeof a.animate !== 'function')) return
    const anims = els.flatMap(([swell, drift], i) => {
      const s = spots[i]
      const tx = `${(s.dx * m.drift * 100).toFixed(1)}%`
      const ty = `${(s.dy * m.drift * 100).toFixed(1)}%`
      const ease = 'ease-in-out'
      return [
        swell.animate(
          [
            { transform: 'scale(1)', opacity: EXHALE, easing: ease },
            { transform: `scale(${1 + m.swell})`, opacity: 1, easing: ease },
            { transform: 'scale(1)', opacity: EXHALE },
          ],
          { duration: 1000, iterations: Infinity },
        ),
        // The drift wanders over two breaths, so the swell and the drift don't move as one.
        drift.animate(
          [
            { transform: 'translate(0, 0)', easing: ease },
            { transform: `translate(${tx}, ${ty})`, easing: ease },
            { transform: 'translate(0, 0)' },
          ],
          { duration: 2000, iterations: Infinity },
        ),
      ]
    })
    for (const a of anims) a.pause()
    animations = anims
    return () => {
      for (const a of anims) a.cancel()
      animations = []
    }
  })

  /** Sets each animation's length from the tempo and, if it has drifted, its phase from the clock. */
  function sync(force: boolean) {
    const breath = breathMs(bpm, beatsPerBar, barsPerBreath)
    const perBreath = Math.max(1, barsPerBreath) * Math.max(1, beatsPerBar || 4)
    // Untracked: the clock ticks every frame, and the breaths must not follow it per frame.
    const at = untrack(() => beat?.()) ?? 0
    animations.forEach((a, k) => {
      const i = k >> 1
      const span = k % 2 === 0 ? 1 : 2
      const length = breath * span
      const timing = a.effect?.getTiming()
      if (timing && timing.duration !== length) {
        a.effect?.updateTiming({ duration: length })
        force = true
      }
      const want = phaseMs(at, perBreath * span, length, spots[i]?.phase ?? 0)
      const now = Number(a.currentTime ?? 0) % length
      const off = Math.min(Math.abs(now - want), length - Math.abs(now - want))
      if (force || off > DRIFT * length) a.currentTime = want
    })
  }

  // Playing: lock to the clock and breathe, re-checking now and then. Stopped: hold still.
  $effect(() => {
    const on = playing
    void bpm
    void beatsPerBar
    void barsPerBreath
    if (reduced || animations.length === 0) return
    if (!on) {
      for (const a of animations) a.pause()
      return
    }
    sync(true)
    for (const a of animations) a.play()
    const t = setInterval(() => sync(false), SYNC_MS)
    return () => clearInterval(t)
  })
</script>

<div class="blooms" aria-hidden="true" style:opacity data-playing={playing && !reduced ? '' : undefined}>
  {#each spots as s, i (i)}
    <div
      class="spot"
      style:left={`${(s.x - s.r) * 100}%`}
      style:top={`calc(${s.y * 100}% - ${s.r * 100}cqw)`}
      style:width={`${s.r * 200}%`}
    >
      <div class="drift" bind:this={drifts[i]}>
        <div class="swell" bind:this={swells[i]} style:background={gradient(colours[i], s.weight)}></div>
      </div>
    </div>
  {/each}
</div>

<style>
  /* Under its siblings (the screen) within its parent's stacking context: the app's artboard, or the
     story's frame. */
  .blooms {
    position: absolute;
    z-index: -1;
    inset: 0;
    container-type: size;
    pointer-events: none;
    transition: opacity 3s ease-in-out;
  }
  .spot {
    position: absolute;
    aspect-ratio: 1;
  }
  .drift,
  .swell {
    width: 100%;
    height: 100%;
  }
  /* Their own layers while breathing, so a breath composites and never repaints. */
  [data-playing] .drift,
  [data-playing] .swell {
    will-change: transform, opacity;
  }
  /* Under reduced motion (no animations), between the exhale and the top of a breath. */
  .swell {
    opacity: 0.9;
  }
  @media (prefers-reduced-motion: reduce) {
    .blooms {
      transition: none;
    }
  }
</style>
