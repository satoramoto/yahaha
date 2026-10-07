// The Blooms backdrop behind each full screen (Stage, Library, Settings): each screen mounts it, and
// sets --backdrop-ground to transparent around it, so the screen above paints no ground of its own
// and the blooms show through.
//
// The test runner drops components' styles, so each screen's own stylesheet is compiled here (the
// same compiler, its scoping classes left out) and put in the document, then the custom property is
// read where Blooms draws, as the browser would cascade it.

import { readFileSync } from 'node:fs'
import { cleanup, render } from '@testing-library/svelte'
import { flushSync, type Component } from 'svelte'
import { compile } from 'svelte/compiler'
import { afterEach, describe, expect, it } from 'vitest'
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
})
