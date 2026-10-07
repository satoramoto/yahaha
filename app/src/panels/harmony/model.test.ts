// The Harm/Arp page's data from the engine's state and the mock's type lists.

import { describe, expect, it } from 'vitest'
import { ARP_PATTERNS, HARMONY_TYPES, initialHarmonyArp } from '../../lib/api/mock-harmony'
import type { ControlTarget, HarmonyArpState } from '../../lib/api/types'
import { arpCategories, caption, harmArpData, itemsOf, kindOf, selectedCategory, volumeKnob } from './model'

const LISTS = { harmonyTypes: HARMONY_TYPES, arpPatterns: ARP_PATTERNS }
const EMPTY = { harmonyTypes: [], arpPatterns: [] }

function state(edit: Partial<HarmonyArpState> = {}): HarmonyArpState {
  return { ...initialHarmonyArp(), ...edit }
}
const harmony = (index: number) => state({ mode: 'harmony', harmonyType: index, typeName: HARMONY_TYPES[index].name, category: HARMONY_TYPES[index].category })
const arp = (index: number, edit: Partial<HarmonyArpState> = {}) =>
  state({ mode: 'arpeggio', arpPattern: index, typeName: ARP_PATTERNS[index].name, category: ARP_PATTERNS[index].category, ...edit })

describe('kindOf and selectedCategory', () => {
  it('names the settings and the tab of each kind of type', () => {
    expect(kindOf(harmony(0))).toBe('harmony')
    expect(kindOf(harmony(19))).toBe('multi')
    expect(kindOf(harmony(21))).toBe('echo')
    expect(kindOf(arp(0))).toBe('arpeggio')
    expect(selectedCategory(harmony(0))).toEqual({ group: 'harmony', name: 'Harmony' })
    expect(selectedCategory(harmony(19))).toEqual({ group: 'harmony', name: 'Multi Assign' })
    expect(selectedCategory(harmony(22))).toEqual({ group: 'harmony', name: 'Echo' })
    expect(selectedCategory(state({ category: 'Newer' }))).toEqual({ group: 'harmony', name: 'Harmony' })
    expect(selectedCategory(arp(5))).toEqual({ group: 'arpeggio', name: 'Random' })
    expect(selectedCategory(arp(0, { category: '' }))).toEqual({ group: 'arpeggio', name: 'Other' })
  })
})

describe('arpCategories and itemsOf', () => {
  it('lists the arpeggio categories in order, Other last', () => {
    expect(arpCategories(LISTS)).toEqual(['Up & Down', 'Random', 'As Played', 'Chord Stab', 'Broken Chord', 'Guitar', 'Sequence'])
    const lists = { harmonyTypes: [], arpPatterns: [{ name: 'A', category: '' }, { name: 'B', category: 'X' }, { name: 'C', category: 'Y' }, { name: 'D', category: 'X' }] }
    expect(arpCategories(lists)).toEqual(['X', 'Y', 'Other'])
    expect(itemsOf(lists, { group: 'arpeggio', name: 'Other' })).toEqual([{ index: 0, name: 'A' }])
    expect(itemsOf(lists, { group: 'arpeggio', name: 'X' })).toEqual([{ index: 1, name: 'B' }, { index: 3, name: 'D' }])
    expect(arpCategories(EMPTY)).toEqual([])
  })

  it('splits the Harmony types into Harmony, Echo and Multi Assign by their full-list index', () => {
    const harm = itemsOf(LISTS, { group: 'harmony', name: 'Harmony' })
    expect(harm).toHaveLength(19)
    expect(harm[0]).toEqual({ index: 0, name: 'Standard Duet 1' })
    expect(itemsOf(LISTS, { group: 'harmony', name: 'Echo' })).toEqual([
      { index: 20, name: 'Echo' },
      { index: 21, name: 'Tremolo' },
      { index: 22, name: 'Trill' },
    ])
    expect(itemsOf(LISTS, { group: 'harmony', name: 'Multi Assign' })).toEqual([{ index: 19, name: 'Multi Assign' }])
    expect(itemsOf(LISTS, { group: 'arpeggio', name: 'Random' })).toEqual([
      { index: 5, name: 'Dice 16' },
      { index: 6, name: 'Scatter Octaves' },
    ])
    // An unknown category lands on the Harmony tab.
    const odd = { harmonyTypes: [{ name: 'New', category: 'Newer' }], arpPatterns: [] }
    expect(itemsOf(odd, { group: 'harmony', name: 'Harmony' })).toEqual([{ index: 0, name: 'New' }])
  })
})

describe('caption and volumeKnob', () => {
  it('captions Echo types and arpeggios', () => {
    expect(caption(harmony(0))).toBe('')
    expect(caption(harmony(20))).toBe('Echo')
    expect(caption(arp(0))).toBe('Arpeggio · Up & Down')
    expect(caption(arp(0, { category: '' }))).toBe('')
  })

  it('finds the knob mapped to the Harmony volume', () => {
    const knobs: ControlTarget[] = [{ kind: 'tempo' }, { kind: 'none' }, { kind: 'harmonyVolume' }, { kind: 'harmonyVolume' }]
    expect(volumeKnob(knobs)).toBe(3)
    expect(volumeKnob([{ kind: 'tempo' }])).toBeNull()
  })
})

describe('harmArpData', () => {
  it('shows the selected type’s category, with the tabs and their counts', () => {
    const d = harmArpData(harmony(21), LISTS, [], null)
    expect(d.kind).toBe('echo')
    expect(d.typeName).toBe('Tremolo')
    expect(d.caption).toBe('Echo')
    expect(d.harmonyTabs).toEqual([
      { group: 'harmony', name: 'Harmony', count: 19, holdsSelected: false },
      { group: 'harmony', name: 'Echo', count: 3, holdsSelected: true },
      { group: 'harmony', name: 'Multi Assign', count: 1, holdsSelected: false },
    ])
    expect(d.arpTabs).toHaveLength(7)
    expect(d.arpTabs[0]).toEqual({ group: 'arpeggio', name: 'Up & Down', count: 5, holdsSelected: false })
    expect(d.viewed).toEqual({ group: 'harmony', name: 'Echo' })
    expect(d.items.map((i) => i.name)).toEqual(['Echo', 'Tremolo', 'Trill'])
    expect(d.selected).toBe(21)
    expect(d.volumeKnob).toBeNull()
  })

  it('browsing another tab shows its items, with nothing selected', () => {
    const d = harmArpData(harmony(0), LISTS, [], { group: 'arpeggio', name: 'Guitar' })
    expect(d.viewed).toEqual({ group: 'arpeggio', name: 'Guitar' })
    expect(d.items.map((i) => i.index)).toEqual([17, 18, 19])
    expect(d.selected).toBeNull()
    expect(d.harmonyTabs[0].holdsSelected).toBe(true)
    // Same group, other tab: index 0 isn't in it.
    expect(harmArpData(harmony(0), LISTS, [], { group: 'harmony', name: 'Echo' }).selected).toBeNull()
    // An arpeggio index that matches a Harmony index doesn't select across groups.
    expect(harmArpData(arp(0), LISTS, [], { group: 'harmony', name: 'Harmony' }).selected).toBeNull()
  })

  it('an arpeggio selects its pattern on its category tab', () => {
    const d = harmArpData(arp(13, { assign: 'multi' }), LISTS, [{ kind: 'harmonyVolume' }], null)
    expect(d.kind).toBe('arpeggio')
    expect(d.viewed).toEqual({ group: 'arpeggio', name: 'Broken Chord' })
    expect(d.selected).toBe(13)
    expect(d.arpTabs.find((t) => t.holdsSelected)?.name).toBe('Broken Chord')
    expect(d.assign).toBe('auto') // HA-D27: a Multi left from a Harmony type plays as Auto.
    expect(d.volumeKnob).toBe(1)
    expect(harmArpData(harmony(0), LISTS, [], null).assign).toBe('auto')
    expect(harmArpData(state({ assign: 'multi' }), LISTS, [], null).assign).toBe('multi')
  })

  it('before the lists load: Harmony tabs empty, an arpeggio has no viewed category', () => {
    const d = harmArpData(arp(2), EMPTY, [], null)
    expect(d.arpTabs).toEqual([])
    expect(d.viewed).toBeNull()
    expect(d.items).toEqual([])
    expect(d.selected).toBeNull()
    const h = harmArpData(harmony(0), EMPTY, [], null)
    expect(h.viewed).toEqual({ group: 'harmony', name: 'Harmony' })
    expect(h.harmonyTabs.map((t) => t.count)).toEqual([0, 0, 0])
    expect(h.selected).toBeNull()
  })

  it('passes the settings through', () => {
    const d = harmArpData(state({ volume: 64, speed: '1/16', chordNoteOnly: true, touchLimit: 30 }), LISTS, [], null)
    expect([d.volume, d.speed, d.chordNoteOnly, d.touchLimit, d.on]).toEqual([64, '1/16', true, 30, false])
    expect(d.arp).toEqual(initialHarmonyArp().arp)
  })
})
