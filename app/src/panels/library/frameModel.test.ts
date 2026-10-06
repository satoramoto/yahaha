import { describe, expect, it } from 'vitest'
import { MockSession } from '../../lib/api/mock'
import { compactNowPlaying, libraryPages, quickRacksBar } from './frameModel'

function session() {
  const s = new MockSession({ demo: true, manual: true })
  s.advance(16)
  return s
}

describe('Library frame', () => {
  it('the page tabs carry their counts; Style map has none', async () => {
    const s = session()
    const library = await s.library()
    const tabs = libraryPages(s.state, library, await s.sounds())
    expect(tabs.map((t) => t.id)).toEqual(['styles', 'sounds', 'instruments', 'racks', 'map'])
    expect(tabs[0].label).toBe(`Styles ${library.entries.length.toLocaleString('en-US')}`)
    expect(tabs[3].label).toBe(`Racks ${s.state.racks.length}`)
    expect(tabs[4].label).toBe('Style map')
    expect(tabs.every((t) => t.tip?.startsWith('library.tab_'))).toBe(true)
  })

  it('the compact block reads the style, tempo, running and section', () => {
    const s = session()
    const np = compactNowPlaying(s.state)
    expect(np.style).toBe(s.state.style.name)
    expect(np.bpm).toBe(Math.round(s.state.transport.tempo))
    expect(np.running).toBe(s.state.transport.running)
    expect(np.section).toMatch(/^(Main|Intro|Ending|Break|Fill)/)
  })

  it('Quick Racks: the bank letter and each slot\'s face; Clear armed is the page\'s own', () => {
    const s = session()
    s.send({ type: 'toggleQuickRackStore' })
    s.send({ type: 'pressQuickRack', slot: 2 })
    s.send({ type: 'saveRackAs', name: 'Ballad' })
    const bar = quickRacksBar(s.state, true)
    expect(bar.bank).toBe('A')
    expect(bar.clear).toBe(true)
    expect(bar.slots).toHaveLength(8)
    expect(bar.slots[2]).toMatchObject({ label: '3', name: 'Ballad', state: 'loaded', tip: 'quick.3' })
    expect(bar.slots[0].state).toBe('empty')
  })
})
