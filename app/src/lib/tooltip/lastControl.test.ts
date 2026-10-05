// lastControl: the last Launchkey message decoded against the state (it fed the old help
// footer's Launchkey screen; kept for the Launchkey page).

import { describe, expect, it } from 'vitest'
import { MockSession } from '../api/mock'
import { lastControl } from './lastControl'

const pack = (s: number, d1: number, d2: number) => (s << 16) | (d1 << 8) | d2

describe('lastControl', () => {
  function state(page?: 'racks') {
    const s = new MockSession({ manual: true })
    if (page) s.send({ type: 'setPadPage', page })
    return s.state
  }

  it('names a pad by number and page, with what it does now', () => {
    const s = state('racks')
    const pad = s.pads.pads.find((p) => p.note === 101)!
    const d = lastControl(pack(0x90, 101, 127), s)!
    expect(d.where).toBe('PAD 6 (page 2)')
    expect(d.what).toBe(pad.label)
    // A note off names the same pad.
    expect(lastControl(pack(0x80, 101, 0), s)!.where).toBe('PAD 6 (page 2)')
  })

  it('names buttons from the surface and faders by number', () => {
    const s = state()
    const play = s.surface.controls.find((c) => c.id === 'play')!
    expect(lastControl(pack(0xb0, play.cc, 127), s)!.where).toBe('PLAY')
    const f = lastControl(pack(0xb0, 6, 90), s)!
    expect(f.where).toBe('FADER 2')
    expect(f.what).toContain(s.surface.faders[1].label)
    expect(lastControl(pack(0xb0, 13, 90), s)!.where).toBe('MASTER FADER')
  })

  it('ignores nothing-yet, Shift on its own and channel-7 mode reports', () => {
    const s = state()
    expect(lastControl(0, s)).toBeNull()
    expect(lastControl(pack(0xb0, 63, 127), s)).toBeNull()
    expect(lastControl(pack(0xb6, 29, 1), s)).toBeNull()
  })
})
