// The Blooms backdrop behind each full screen (Stage, Library, Settings): each screen mounts it, and
// sets --backdrop-ground to transparent around it, so the screen above paints no ground of its own
// and the blooms show through.
//
// The test runner drops components' styles, so each screen's own stylesheet is compiled here (the
// same compiler, its scoping classes left out) and put in the document, then the custom property is
// read where Blooms draws, as the browser would cascade it.

import { readFileSync } from 'node:fs'
import { cleanup, render } from '@testing-library/svelte'
import { flushSync, tick, type Component } from 'svelte'
import { compile } from 'svelte/compiler'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { breathMs } from '../ui/Blooms/blooms'
import { MockSession } from '../lib/api/mock'
import { app } from '../lib/store.svelte'
import LibraryScreen from './library/LibraryScreen.svelte'
import SettingsScreen from './settings/SettingsScreen.svelte'
import StageScreen from './stage/StageScreen.svelte'

afterEach(() => {
  cleanup()
  app.detach()
  for (const s of document.head.querySelectorAll('style[data-screen]')) s.remove()
})

/** The screen's own CSS, unscoped. */
function styles(file: string): string {
  const source = readFileSync(new URL(file, import.meta.url), 'utf8')
  const { css } = compile(source, { filename: file, css: 'external' })
  return (css?.code ?? '').replace(/\.svelte-[a-z0-9]+/g, '')
}

const screens: [string, Component, string][] = [
  ['StageScreen', StageScreen as Component, './stage/StageScreen.svelte'],
  ['LibraryScreen', LibraryScreen as Component, './library/LibraryScreen.svelte'],
  ['SettingsScreen', SettingsScreen as Component, './settings/SettingsScreen.svelte'],
]

describe('Blooms behind each screen', () => {
  it.each(screens)('%s mounts Blooms on a transparent --backdrop-ground', (_, Screen, file) => {
    const style = document.createElement('style')
    style.dataset.screen = ''
    style.textContent = styles(file)
    document.head.append(style)
    const session = new MockSession({ demo: true, manual: true })
    session.advance(16)
    app.attach(session)
    flushSync()
    const { container } = render(Screen)
    const blooms = container.querySelectorAll<HTMLElement>('.blooms')
    expect(blooms).toHaveLength(1)
    expect(blooms[0].getAttribute('aria-hidden')).toBe('true')
    expect(getComputedStyle(blooms[0]).getPropertyValue('--backdrop-ground').trim()).toBe('transparent')
  })

  // The owner's bug report ("the blooms aren't moving when the band plays"): the screens must feed
  // the band's transport through, so the blooms breathe at its tempo while it plays and hold still
  // when it stops. jsdom has no Web Animations, so `animate` is a fake that records what is asked.
  describe('breathing with the band', () => {
    type Fake = { duration: number; playState: string }
    let fakes: Fake[] = []
    const realAnimate = Element.prototype.animate
    beforeEach(() => {
      fakes = []
      Element.prototype.animate = function (_k: Keyframe[], o: KeyframeAnimationOptions) {
        const a = {
          duration: Number(o.duration),
          playState: 'running',
          currentTime: 0,
          playbackRate: 1,
          play: () => (a.playState = 'running'),
          pause: () => (a.playState = 'paused'),
          cancel: () => (a.playState = 'idle'),
          effect: { getTiming: () => ({ duration: a.duration }), updateTiming: (t: { duration: number }) => (a.duration = t.duration) },
        }
        fakes.push(a)
        return a as unknown as Animation
      } as typeof Element.prototype.animate
    })
    afterEach(() => {
      Element.prototype.animate = realAnimate
    })

    it.each(screens)('%s: the blooms breathe at the tempo while the band plays', async (_, Screen) => {
      const session = new MockSession({ demo: true, manual: true })
      session.advance(16)
      app.attach(session)
      flushSync()
      const t = app.state.transport
      expect(t.running).toBe(true)
      const { container } = render(Screen)
      await tick()
      expect(container.querySelector('.blooms')?.hasAttribute('data-playing')).toBe(true)
      const live = fakes.filter((a) => a.playState !== 'idle')
      expect(live.length).toBeGreaterThan(0)
      expect(live.every((a) => a.playState === 'running')).toBe(true)
      // The swells (every other one) last one breath at the band's tempo and metre.
      const breath = breathMs(t.tempo, t.beatsPerBar, 4)
      expect(live.filter((_, k) => k % 2 === 0).map((a) => a.duration)).toEqual(live.filter((_, k) => k % 2 === 0).map(() => breath))
    })

    it.each(screens)('%s: the blooms hold still while the band is stopped', async (_, Screen) => {
      app.attach(new MockSession({ manual: true }))
      flushSync()
      expect(app.state.transport.running).toBe(false)
      const { container } = render(Screen)
      await tick()
      expect(container.querySelector('.blooms')?.hasAttribute('data-playing')).toBe(false)
      const live = fakes.filter((a) => a.playState !== 'idle')
      expect(live.length).toBeGreaterThan(0)
      expect(live.every((a) => a.playState === 'paused')).toBe(true)
    })
  })
})
