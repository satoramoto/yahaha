import { describe, expect, it } from 'vitest'
import { FUNCTIONS, functionCmd } from './assignable'

describe('assignable functions', () => {
  it('every trigger the engine runs as a command maps to one here (the mock)', () => {
    const control = ['otsNext', 'otsPrev', 'none']
    for (const f of FUNCTIONS.filter((f) => f.available && f.kind === 'trigger' && !control.includes(f.id))) {
      expect(functionCmd(f.id, { fingering: 'fingered' }), f.id).not.toBeNull()
    }
  })

  it('Transpose +/− is the TRANSPOSE buttons: Master transpose (RM p.144)', () => {
    expect(functionCmd('transposeUp', { fingering: 'fingered' })).toEqual({ type: 'stepTranspose', keyboard: 0, master: 1 })
    expect(functionCmd('transposeDown', { fingering: 'fingered' })).toEqual({ type: 'stepTranspose', keyboard: 0, master: -1 })
  })

  it('Registration bank files, Freeze and Sequence are not available (Quick Racks replaced them)', () => {
    for (const id of ['registBankNext', 'registBankPrev', 'registFreeze', 'registSequence']) {
      expect(FUNCTIONS.find((f) => f.id === id)?.available, id).toBe(false)
    }
  })

  it('the Registration functions run Quick Racks (the Launchkey page 4 pads)', () => {
    expect(FUNCTIONS.find((f) => f.id === 'snapshotBankNext')?.available).toBe(true)
    const run = (id: Parameters<typeof functionCmd>[0]) => functionCmd(id, { fingering: 'fingered' })
    expect(run('snapshotBankNext')).toEqual({ type: 'stepQuickRackBank', delta: 1 })
    expect(run('snapshotBankPrev')).toEqual({ type: 'stepQuickRackBank', delta: -1 })
    expect(run('regist3')).toEqual({ type: 'pressQuickRack', slot: 2 })
    expect(run('regist10')).toEqual({ type: 'pressQuickRack', slot: 9 })
    expect(run('registNext')).toEqual({ type: 'stepQuickRack', delta: 1 })
    expect(run('registPrev')).toEqual({ type: 'stepQuickRack', delta: -1 })
    expect(run('registMemory')).toEqual({ type: 'toggleQuickRackStore' })
  })
})
