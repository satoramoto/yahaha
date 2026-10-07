// EffectsPage on a MockSession: the library's Effects draws the session's state, its rows open
// their editors, and its controls change the session.

import { cleanup, fireEvent, render } from '@testing-library/svelte'
import { flushSync } from 'svelte'
import { afterEach, describe, expect, it } from 'vitest'
import { MockSession } from '../../lib/api/mock'
import { app } from '../../lib/store.svelte'
import EffectsPage from './EffectsPage.svelte'
import { effectsNav } from './nav.svelte'

function setup() {
  const session = new MockSession({ demo: true, manual: true })
  session.advance(16)
  app.attach(session)
  flushSync()
  render(EffectsPage, { props: { tipAction: () => {} } })
  return session
}

afterEach(() => {
  cleanup()
  app.detach()
  effectsNav.reset()
})

const list = () => document.querySelector<HTMLElement>('nav[aria-label="Effects"]')!
const row = (name: RegExp) => [...list().querySelectorAll('button')].find((b) => name.test(b.getAttribute('aria-label') ?? ''))!
const editor = () => document.querySelector<HTMLElement>('.editor section')!

function settle(session: MockSession) {
  session.advance(16)
  flushSync()
}

describe('EffectsPage', () => {
  it('opens send 1 at first, and another row opens its editor', () => {
    setup()
    expect(editor().getAttribute('aria-label')).toBe('Reverb, send 1')
    fireEvent.click(row(/^Send 3, Delay/))
    flushSync()
    expect(effectsNav.bus).toBe(2)
    expect(editor().getAttribute('aria-label')).toBe('Delay, send 3')
    fireEvent.click(row(/^Master/))
    flushSync()
    expect(editor().getAttribute('aria-label')).toBe('Master')
    fireEvent.click(row(/^Style inserts/))
    flushSync()
    expect(editor().getAttribute('aria-label')).toBe('Style inserts')
  })

  it('adds a send and opens it as it arrives; Remove takes it away and goes back to send 1', () => {
    const session = setup()
    fireEvent.click(row(/^Add a send effect/))
    settle(session)
    expect(session.state.effects.sends).toHaveLength(4)
    expect(editor().getAttribute('aria-label')).toBe('Hall, send 4')
    const remove = editor().querySelector<HTMLButtonElement>('[data-tip="fx.send_remove"]')!
    fireEvent.click(remove)
    settle(session)
    expect(session.state.effects.sends).toHaveLength(3)
    expect(effectsNav.bus).toBe(0)
  })

  it('steps a readout and a part send in the session', () => {
    const session = setup()
    const before = session.state.effects.blocks[0].returnLevel
    const ret = editor().querySelector<HTMLElement>('[data-tip="fx.reverb_return"]')!
    fireEvent.keyDown(ret, { key: 'ArrowRight' })
    settle(session)
    expect(session.state.effects.blocks[0].returnLevel).toBe(before + 1)
    const r1 = editor().querySelector<HTMLElement>('[data-tip="fx.part_sends"]')!
    const sent = session.state.keyboardParts[0].strip.sends[0]
    fireEvent.keyDown(r1, { key: 'ArrowRight' })
    settle(session)
    expect(session.state.keyboardParts[0].strip.sends[0]).toBe(sent + 1)
  })

  it('switches the mix: the inserts, the rotary, the Master Compressor', () => {
    const session = setup()
    const lamp = (tip: string) => document.querySelector<HTMLButtonElement>(`[data-tip="${tip}"]`)!
    const inserts = session.state.effects.insertsOn
    fireEvent.click(lamp('fx.inserts'))
    settle(session)
    expect(session.state.effects.insertsOn).toBe(!inserts)
    const rotary = session.state.effects.rotaryFast
    fireEvent.click(lamp('fx.rotary_fast'))
    settle(session)
    expect(session.state.effects.rotaryFast).toBe(!rotary)
    const comp = session.state.effects.master.compressor.on
    fireEvent.click(lamp('fx.master_comp'))
    settle(session)
    expect(session.state.effects.master.compressor.on).toBe(!comp)
  })

  it('reads the returns in dB: the list and the Return readout', () => {
    const session = setup()
    const level = session.state.effects.blocks[0].returnLevel
    const db = level === 0 ? 'Off' : `${level >= 64 ? '+' : ''}${(20 * Math.log10(level / 64)).toFixed(1)} dB`
    expect(row(/^Send 1, Reverb/).getAttribute('aria-label')).toContain(`return ${db}`)
    expect(row(/^Send 1, Reverb/).textContent).toContain(db)
    expect(editor().querySelector('[data-tip="fx.reverb_return"]')!.textContent).toContain(db.replace(' dB', ''))
  })

  it('sets a Master EQ band to any Hz: an arrow key off the XG steps, and typed digits', () => {
    const session = setup()
    fireEvent.click(row(/^Master/))
    flushSync()
    const freq = () => editor().querySelector<HTMLElement>('[aria-label="EQ band 2 frequency"]')!
    const before = session.state.effects.master.eq.bands[1].freq
    fireEvent.keyDown(freq(), { key: 'ArrowRight' })
    settle(session)
    const stepped = session.state.effects.master.eq.bands[1].freq
    expect(stepped).toBeGreaterThan(before)
    expect(stepped - before).toBeLessThan(before * 0.05)
    for (const key of ['1', '2', '3', '4', 'Enter']) fireEvent.keyDown(freq(), { key })
    settle(session)
    expect(session.state.effects.master.eq.bands[1].freq).toBe(1234)
    expect(freq().textContent).toContain('1234')
  })

  it('changes a style bus\'s type and source', () => {
    const session = setup()
    fireEvent.click(row(/^Send 3, Delay/))
    flushSync()
    const tab = [...editor().querySelectorAll<HTMLButtonElement>('[role="tab"]')].find((b) => b.textContent?.trim() === 'Ping-pong')!
    fireEvent.click(tab)
    settle(session)
    expect(session.state.effects.blocks[2].effect).toBe('pingPong')
    expect(session.state.effects.blocks[2].followStyle).toBe(false)
  })
})
