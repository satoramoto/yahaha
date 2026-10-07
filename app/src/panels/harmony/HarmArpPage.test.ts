// HarmArpPage on a MockSession: the library's HarmArp draws the session's Harmony/Arpeggio state,
// a category tab only browses, and the controls change the session.

import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte'
import { flushSync } from 'svelte'
import { afterEach, describe, expect, it } from 'vitest'
import { LIBRARY, MockSession } from '../../lib/api/mock'
import { app } from '../../lib/store.svelte'
import HarmArpPage from './HarmArpPage.svelte'

function setup() {
  const session = new MockSession({ demo: true, manual: true })
  app.attach(session)
  app.library = LIBRARY
  flushSync()
  render(HarmArpPage, { props: { tipAction: () => {} } })
  const sent: string[] = []
  const send = session.send.bind(session)
  session.send = (cmd) => {
    sent.push(cmd.type)
    return send(cmd)
  }
  return { session, sent }
}

afterEach(() => {
  cleanup()
  app.detach()
})

const click = async (el: HTMLElement) => {
  await fireEvent.click(el)
  flushSync()
}
const tab = (list: string, name: RegExp | string) => within(screen.getByRole('tablist', { name: list })).getByRole('tab', { name })
const grid = (name: string) => screen.getByRole('group', { name })
const item = (gridName: string, name: string) => within(grid(gridName)).getByRole('button', { name })

describe('HarmArpPage', () => {
  it('shows the selected type in its category and switches the effect on', async () => {
    const { session } = setup()
    expect(item('Harmony types', 'Standard Duet 1').getAttribute('aria-pressed')).toBe('true')
    const sw = screen.getByRole('button', { name: /^Harmony\/Arpeggio off/ })
    await click(sw)
    expect(session.state.harmonyArp.on).toBe(true)
    expect(screen.getByRole('button', { name: /^Harmony\/Arpeggio on/ }).getAttribute('aria-pressed')).toBe('true')
  })

  it('a category tab changes the grid and sends nothing; a pick sends and snaps back', async () => {
    const { session, sent } = setup()
    await click(tab('Harmony categories', /^Echo:/))
    expect(within(grid('Echo types')).getAllByRole('button').map((b) => b.textContent?.trim())).toEqual(['Echo', 'Tremolo', 'Trill'])
    await click(tab('Arpeggio categories', /^Up & Down:/))
    expect(item('Up & Down patterns', 'Climb 16').getAttribute('aria-pressed')).toBe('false')
    expect(sent).toEqual([])
    await click(tab('Harmony categories', /^Echo:/))
    await click(item('Echo types', 'Tremolo'))
    expect(sent).toEqual(['setHarmonyType'])
    expect(session.state.harmonyArp.typeName).toBe('Tremolo')
    expect(item('Echo types', 'Tremolo').getAttribute('aria-pressed')).toBe('true')
    // Echo has Speed.
    await click(within(screen.getByRole('tablist', { name: 'Speed' })).getByRole('tab', { name: '1/16' }))
    expect(session.state.harmonyArp.speed).toBe('1/16')
    // The chosen type again sends nothing.
    await click(item('Echo types', 'Tremolo'))
    expect(sent).toEqual(['setHarmonyType', 'setHarmonySpeed'])
  })

  it('a picked type snaps the browsed tab back to its own category', async () => {
    setup()
    await click(tab('Arpeggio categories', /^Guitar:/))
    await click(tab('Harmony categories', /^Multi Assign:/))
    await click(item('Multi Assign types', 'Multi Assign'))
    expect(item('Multi Assign types', 'Multi Assign').getAttribute('aria-pressed')).toBe('true')
    await click(tab('Harmony categories', /^Harmony:/))
    await click(item('Harmony types', 'Block'))
    expect(item('Harmony types', 'Block').getAttribute('aria-pressed')).toBe('true')
  })

  it('a selection changed elsewhere snaps the browsed tab to it', async () => {
    const { session } = setup()
    await click(tab('Harmony categories', /^Echo:/))
    expect(grid('Echo types')).toBeTruthy()
    session.send({ type: 'setArpPattern', index: 5 })
    session.advance(1)
    flushSync()
    expect(item('Random patterns', 'Dice 16').getAttribute('aria-pressed')).toBe('true')
  })

  it('an arpeggio shows its settings and sends their commands', async () => {
    const { session } = setup()
    await click(tab('Arpeggio categories', /^Broken Chord:/))
    await click(item('Broken Chord patterns', 'Alberti 16'))
    const h = () => session.state.harmonyArp
    expect(h().mode).toBe('arpeggio')
    expect(screen.queryByRole('button', { name: 'Chord note only' })).toBeNull()
    await click(within(screen.getByRole('tablist', { name: 'Arpeggio quantize' })).getByRole('tab', { name: '1/16' }))
    expect(h().arp.quantize).toBe('sixteenth')
    await click(screen.getByRole('button', { name: 'Arpeggio Hold' }))
    expect(h().arp.hold).toBe(true)
    await click(screen.getByRole('button', { name: 'Arpeggio Hold pedal' }))
    expect(h().arp.pedalHold).toBe(true)
    await click(screen.getByRole('button', { name: 'Keep Key On' }))
    expect(h().arp.keepKeyOn).toBe(true)
    await click(within(screen.getByRole('tablist', { name: 'Arpeggio velocity' })).getByRole('tab', { name: 'Fixed' }))
    expect(h().arp.velocity).toBe('fixed')
    expect(screen.getByRole('slider', { name: 'Fixed velocity' })).toBeTruthy()
    await click(within(screen.getByRole('tablist', { name: 'Assign' })).getByRole('tab', { name: 'Right 2' }))
    expect(h().assign).toBe('right2')
  })

  it('a Harmony type has Chord note only and Touch limit', async () => {
    const { session } = setup()
    expect(screen.getByRole('slider', { name: 'Volume' })).toBeTruthy()
    expect(screen.getByRole('slider', { name: 'Touch limit' })).toBeTruthy()
    await click(screen.getByRole('button', { name: 'Chord note only' }))
    expect(session.state.harmonyArp.chordNoteOnly).toBe(true)
  })
})
