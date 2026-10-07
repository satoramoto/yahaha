import { describe, expect, it } from 'vitest'
import { keyAt, keysBetween, noteName, SPLIT_MAX, SPLIT_MIN } from './notes'

describe('split strip geometry', () => {
  const keys = keysBetween(SPLIT_MIN, SPLIT_MAX)

  it('covers C0–C6 with 43 white keys', () => {
    expect(keys.filter((k) => !k.black)).toHaveLength(43)
    expect(noteName(SPLIT_MIN)).toBe('C0')
    expect(noteName(SPLIT_MAX)).toBe('C6')
    expect(noteName(60)).toBe('C3')
    expect(noteName(54)).toBe('F#2')
    expect(noteName(56)).toBe('Ab2')
  })

  it('finds black keys in the top part and white keys below', () => {
    // White key 0 is C0 (24); the C#0 black key straddles the line at x = 1.
    expect(keyAt(keys, 0.5, 0.9)).toBe(24)
    expect(keyAt(keys, 1.0, 0.3)).toBe(25)
    expect(keyAt(keys, 1.0, 0.9)).toBe(26)
    expect(keyAt(keys, 2.1, 0.3)).toBe(27)
    expect(keyAt(keys, 2.9, 0.3)).toBe(28)
    expect(keyAt(keys, 3.0, 0.3)).toBe(29) // E–F: no black key between them
    expect(keyAt(keys, 99, 0.9)).toBe(96)
  })
})
