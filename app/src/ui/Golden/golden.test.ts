import { describe, expect, it } from 'vitest'
import { addsUp, cellTrack, overflows, PHI, report, spiralSlots, summary, type SlotMeasure } from './golden'

const slot = (over: Partial<SlotMeasure>): SlotMeasure => ({
  rect: { x: 0, y: 0, w: 50, h: 20 },
  client: { w: 50, h: 20 },
  scroll: { w: 50, h: 20 },
  clipped: [],
  name: 'slot',
  cut: false,
  ...over,
})

describe('addsUp', () => {
  it("the Stage's display row adds up to phi³", () => {
    expect(addsUp(['unison', 'unison', '1:phi', '1:phi', 'unison'], 'phi3')?.adds).toBe(true)
  })
  it('three squares do not fill a phi³ box', () => {
    const check = addsUp(['unison', 'unison', 'unison'], 'phi3')
    expect(check?.adds).toBe(false)
    expect(check?.sum).toBe(3)
  })
  it('a shape leaves it to the measurement (the tuning decides)', () => {
    expect(addsUp(['knob', 'unison'], 'phi2')).toBeUndefined()
    expect(addsUp(['unison'], undefined)).toBeUndefined()
  })
})

it('cellTrack: a cell is its interval of the cross size, or the inverse', () => {
  expect(cellTrack('phi', 'cqh')).toBe('calc(100cqh * var(--interval-phi))')
  expect(cellTrack('1:knob', 'cqw')).toBe('calc(100cqw / var(--shape-knob))')
})

describe('spiralSlots', () => {
  it('cuts squares off a phi box, the last slot the remainder', () => {
    const [first, second, rest] = spiralSlots(3)
    // The first square is as tall as the box: 1 / phi of its width.
    expect(first.w).toBeCloseTo(1 / PHI)
    expect(first.h).toBeCloseTo(1)
    // The second sits at the bottom of what is left, as wide as it.
    expect(second.x).toBeCloseTo(1 / PHI)
    expect(second.y + second.h).toBeCloseTo(1)
    // The slots cover the box exactly.
    const area = [first, second, rest].reduce((n, r) => n + r.w * r.h, 0)
    expect(area).toBeCloseTo(1)
  })
})

describe('overflow', () => {
  it('a slot overflows when its content is past it, or when text in it is cut short', () => {
    expect(overflows(slot({}))).toBe(false)
    expect(overflows(slot({ scroll: { w: 50, h: 24 } }))).toBe(true)
    expect(overflows(slot({ clipped: ['Retrig rate'] }))).toBe(true)
    // Under a px is rounding, not overflow.
    expect(overflows(slot({ scroll: { w: 50.6, h: 20 } }))).toBe(false)
  })

  it('the report names what overflows, the spare round each box, and the rows that do not add up', () => {
    const r = report(
      [slot({ clipped: ['Retrig rate'] }), slot({ name: 'value', scroll: { w: 50, h: 30 } }), slot({})],
      [{ shape: 'knob', rect: { x: 0, y: 0, w: 54, h: 88 }, slot: { x: 0, y: 0, w: 54, h: 115 } }],
      [
        { name: 'display', rect: { x: 0, y: 0, w: 1, h: 1 }, along: 100, sum: 100 },
        { name: 'short', rect: { x: 0, y: 0, w: 1, h: 1 }, along: 100, sum: 90 },
        { name: 'named', rect: { x: 0, y: 0, w: 1, h: 1 }, along: 0, sum: 0, declared: false },
      ],
      [],
    )
    expect(r.overflow).toEqual(['Retrig rate', 'value'])
    expect(r.slots.map((s) => s.off)).toEqual([true, true, false])
    expect(r.rowsOff).toEqual(['short', 'named'])
    expect(r.boxes[0]).toMatchObject({ spareW: 0, spareH: 27 })
    expect(summary(r, 'knob')).toBe("knob 54 × 88 · spare 0 × 27 · overflow 2 (Retrig rate, value) · 2 of 3 rows don't add up")
  })
})
