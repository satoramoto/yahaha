/**
 * The blooms' motion: compositor animations that breathe only while playing, phase-locked to the
 * clock, sized by the tempo, still under reduced motion; and the pure helpers in blooms.ts. jsdom has
 * no Web Animations, so `Element.animate` is a fake that records what the blooms ask for.
 */
import { cleanup, render } from '@testing-library/svelte'
import { tick } from 'svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Blooms from './Blooms.svelte'
import { PLAY_LOUD, PLAY_QUIET, REST, SPOTS, alphaAt, breathMs, gradient, hues, levelOf, phaseMs } from './blooms'

type Fake = {
  keyframes: Keyframe[]
  duration: number
  currentTime: number
  playState: 'running' | 'paused' | 'idle'
  play: () => void
  pause: () => void
  cancel: () => void
  effect: { getTiming: () => { duration: number }; updateTiming: (t: { duration: number }) => void }
}

let fakes: Fake[] = []
const realAnimate = Element.prototype.animate
const realMatchMedia = window.matchMedia

function fakeAnimate(this: Element, keyframes: Keyframe[], options: KeyframeAnimationOptions): Animation {
  const a: Fake = {
    keyframes,
    duration: Number(options.duration),
    currentTime: 0,
    playState: 'running',
    play: () => (a.playState = 'running'),
    pause: () => (a.playState = 'paused'),
    cancel: () => (a.playState = 'idle'),
    effect: {
      getTiming: () => ({ duration: a.duration }),
      updateTiming: (t) => (a.duration = t.duration),
    },
  }
  fakes.push(a)
  return a as unknown as Animation
}

function reducedMotion(on: boolean) {
  window.matchMedia = ((q: string) => ({
    matches: on && q.includes('reduce'),
    media: q,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia
}

beforeEach(() => {
  fakes = []
  Element.prototype.animate = fakeAnimate as unknown as typeof Element.prototype.animate
  reducedMotion(false)
})

afterEach(() => {
  cleanup()
  Element.prototype.animate = realAnimate
  window.matchMedia = realMatchMedia
  vi.useRealTimers()
})

const live = () => fakes.filter((a) => a.playState !== 'idle')

describe('Blooms', () => {
  it('draws one bloom per hue of the palette, hidden from assistive tech', () => {
    const { container } = render(Blooms, { palette: 'parts' })
    const root = container.querySelector('.blooms')
    expect(root?.getAttribute('aria-hidden')).toBe('true')
    expect(container.querySelectorAll('.swell')).toHaveLength(5)
    expect((container.querySelector('.swell') as HTMLElement).style.background).toContain('--bloom-a')
  })

  it('holds still while stopped, and dims to the rest opacity', async () => {
    const { container } = render(Blooms, { playing: false })
    await tick()
    expect(live().length).toBe(8)
    expect(live().every((a) => a.playState === 'paused')).toBe(true)
    expect(Number((container.querySelector('.blooms') as HTMLElement).style.opacity)).toBeCloseTo(REST)
  })

  it('breathes while playing: one breath per 4 bars at the tempo, locked to the clock', async () => {
    const beat = vi.fn(() => 8)
    render(Blooms, { playing: true, bpm: 120, beatsPerBar: 4, barsPerBreath: 4, beat })
    await tick()
    const [swell, drift] = live()
    expect(swell.playState).toBe('running')
    // 4 bars of 4 at 120 BPM: 8 s; the drift spans two breaths.
    expect(swell.duration).toBe(8000)
    expect(drift.duration).toBe(16000)
    // Beat 8 of a 16-beat breath, plus the first spot's phase (0): half way.
    expect(swell.currentTime).toBeCloseTo(4000)
    expect(beat).toHaveBeenCalled()
    // Only transform and opacity animate.
    const props = new Set(live().flatMap((a) => a.keyframes.flatMap((k) => Object.keys(k))))
    expect([...props].sort()).toEqual(['easing', 'opacity', 'transform'])
  })

  it('re-locks when the tempo changes, and pauses again on stop', async () => {
    const view = render(Blooms, { playing: true, bpm: 120, beat: () => 0 })
    await tick()
    await view.rerender({ playing: true, bpm: 60, beat: () => 0 })
    await tick()
    expect(live()[0].duration).toBe(16000)
    await view.rerender({ playing: false, bpm: 60, beat: () => 0 })
    await tick()
    expect(live().every((a) => a.playState === 'paused')).toBe(true)
  })

  it('reads the clock only when it syncs, every few seconds', async () => {
    vi.useFakeTimers()
    const beat = vi.fn(() => 0)
    render(Blooms, { playing: true, beat })
    await tick()
    const first = beat.mock.calls.length
    vi.advanceTimersByTime(1000)
    expect(beat.mock.calls.length).toBe(first)
    vi.advanceTimersByTime(4000)
    expect(beat.mock.calls.length).toBe(first + 1)
  })

  it('moves nothing under prefers-reduced-motion', async () => {
    reducedMotion(true)
    const { container } = render(Blooms, { playing: true, beat: () => 0 })
    await tick()
    expect(fakes).toHaveLength(0)
    expect(Number((container.querySelector('.blooms') as HTMLElement).style.opacity)).toBeCloseTo(REST)
  })

  it('lifts with the level while playing', async () => {
    const view = render(Blooms, { playing: true, level: 0, beat: () => 0 })
    await tick()
    const root = view.container.querySelector('.blooms') as HTMLElement
    expect(Number(root.style.opacity)).toBeCloseTo(PLAY_QUIET)
    // A change inside half a second waits (at most two opacity changes a second).
    await view.rerender({ playing: true, level: 1, beat: () => 0 })
    await tick()
    expect(Number(root.style.opacity)).toBeCloseTo(PLAY_QUIET)
    await new Promise((r) => setTimeout(r, 550))
    await tick()
    expect(Number(root.style.opacity)).toBeCloseTo(PLAY_LOUD)
  })
})

describe('blooms.ts', () => {
  it('times a breath from the tempo and metre', () => {
    expect(breathMs(120, 4, 4)).toBe(8000)
    expect(breathMs(90, 3, 2)).toBe(4000)
  })

  it('puts a spot in its breath by the clock and its phase', () => {
    expect(phaseMs(0, 16, 8000, 0)).toBe(0)
    expect(phaseMs(20, 16, 8000, 0)).toBe(2000)
    expect(phaseMs(0, 16, 8000, 0.25)).toBe(2000)
  })

  it('maps the master RMS to a level', () => {
    expect(levelOf(undefined)).toBe(0)
    expect(levelOf([0, 0])).toBe(0)
    expect(levelOf([1, 0.5])).toBe(1)
    expect(levelOf([0.05, 0.02])).toBeGreaterThan(0.3)
    expect(levelOf([0.05, 0.02])).toBeLessThan(0.6)
  })

  it('fades a bloom to nothing at its edge', () => {
    expect(alphaAt(0, 1)).toBe(1)
    expect(alphaAt(1, 1)).toBe(0)
    expect(alphaAt(0.5, 0.5)).toBeCloseTo(0.2)
    expect(alphaAt(0.375, 1)).toBeCloseTo(0.57)
    expect(gradient('--bloom-a', 1)).toMatch(/^radial-gradient\(closest-side, color-mix\(in srgb, var\(--bloom-a\)/)
  })

  it('anchors the accent at top right, in every palette', () => {
    for (const p of ['aurora', 'parts', 'section'] as const) expect(hues(p)[0]).toBe('--bloom-a')
    expect(SPOTS[0].x).toBeGreaterThan(0.5)
    expect(SPOTS[0].y).toBeLessThan(0.5)
    expect(hues('section', 'ending').slice(1)).toEqual(['--bloom-ending', '--bloom-ending', '--bloom-ending'])
  })
})
