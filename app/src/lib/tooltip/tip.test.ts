// The tooltip action's free text: an element's `data-tip-text` shows with its catalog entry, and
// a change to it (then the action's `update`) reaches a tip already showing.

import { cleanup, fireEvent, render } from '@testing-library/svelte'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { Action } from 'svelte/action'
import ChordReadout from '../../ui/ChordReadout/ChordReadout.svelte'
import { tip, tips } from './tip.svelte'

beforeEach(() => tips.reset())
afterEach(() => {
  cleanup()
  tips.reset()
})

const hover = (el: HTMLElement) => fireEvent.pointerEnter(el, { pointerType: 'mouse' })

describe('tip free text', () => {
  it('shows the element\'s data-tip-text with its key', () => {
    const el = document.createElement('span')
    el.dataset.tipText = 'AI Full Keyboard · played Gm7'
    const handle = tip(el, 'fingering.select')
    hover(el)
    expect(tips.shown).toBe('fingering.select')
    expect(tips.shownText).toBe('AI Full Keyboard · played Gm7')
    handle.destroy()
  })

  it('a keyed tip alone has no free text', () => {
    const el = document.createElement('button')
    const handle = tip(el, 'fingering.select')
    hover(el)
    expect(tips.shown).toBe('fingering.select')
    expect(tips.shownText).toBeNull()
    handle.destroy()
  })

  it('update follows a changed text while showing, and only for the shown element', () => {
    const a = document.createElement('span')
    const b = document.createElement('span')
    a.dataset.tipText = 'Fingered'
    b.dataset.tipText = 'Single Finger'
    const ha = tip(a, 'fingering.select')
    const hb = tip(b, 'fingering.select')
    hover(a)
    a.dataset.tipText = 'Fingered On Bass'
    ha.update('fingering.select')
    expect(tips.shownText).toBe('Fingered On Bass')
    b.dataset.tipText = 'Multi Finger'
    hb.update('fingering.select')
    expect(tips.shownText).toBe('Fingered On Bass')
    ha.destroy()
    hb.destroy()
  })

  it('help mode pins the text with its entry', () => {
    tips.toggleHelp()
    const el = document.createElement('span')
    el.dataset.tipText = 'Fingered'
    const handle = tip(el, 'fingering.select')
    hover(el)
    tips.hide()
    expect(tips.shown).toBe('fingering.select')
    expect(tips.shownText).toBe('Fingered')
    handle.destroy()
  })
})

describe('ChordReadout through the tip action', () => {
  const tipAction = tip as unknown as Action<HTMLElement, string>

  it('hovering the fingering shows its whole text; a new chord\'s fingering follows', async () => {
    const LONG = 'AI Full Keyboard · Keyboard transpose +2 · played Gm7 over the whole keyboard'
    const { container, rerender } = render(ChordReadout, { chord: 'Gm', extension: '7', fingering: LONG, tip: 'fingering.select', tipAction })
    const fingering = container.querySelector('.fingering') as HTMLElement
    await hover(fingering)
    expect(tips.shown).toBe('fingering.select')
    expect(tips.shownText).toBe(LONG)
    await rerender({ chord: 'C', extension: '', fingering: 'AI Full Keyboard · played C', tip: 'fingering.select', tipAction })
    expect(fingering.dataset.tipText).toBe('AI Full Keyboard · played C')
    expect(tips.shownText).toBe('AI Full Keyboard · played C')
  })
})
