// Library › Style map (StyleMap board): the families, the chosen family's programs, the rules
// set globally or for this style, and Add from SoundFont.

import { cleanup, fireEvent, render } from '@testing-library/svelte'
import { flushSync } from 'svelte'
import { afterEach, describe, expect, it } from 'vitest'
import { GM, MockSession } from '../../lib/api/mock'
import { app, ui } from '../../lib/store.svelte'
import { nav, sourceText } from '../sound/nav.svelte'
import MapTab from './MapTab.svelte'
import { libraryNav } from './nav.svelte'

function setup() {
  const session = new MockSession({ manual: true })
  app.attach(session)
  flushSync()
  render(MapTab)
  return session
}

afterEach(() => {
  cleanup()
  app.detach()
  libraryNav.reset()
  nav.reset()
  ui.soundPick = null
})

const tipped = (key: string) => [...document.querySelectorAll<HTMLElement>(`[data-tip="${key}"]`)]
/** A map picker (#117): open it, and pick in the sound picker (catalog id; null clears). */
const pickIn = async (el: HTMLElement, id: string | null) => {
  if (id === null) {
    await fireEvent.click(el.parentElement!.querySelector<HTMLElement>('[data-tip="sound.rule_clear"]')!)
  } else {
    await fireEvent.click(el)
    expect(ui.soundPick).not.toBe(null)
    ui.soundPick!.onpick(id)
    ui.soundPick = null
  }
  flushSync()
}
const family = async (i: number) => {
  // Row 0 is the drums; family f is row f + 1.
  await fireEvent.click(tipped('sound.map_family')[i + 1])
  flushSync()
}
const froms = () => [...document.querySelectorAll('.from')].map((e) => e.textContent)

describe('Library › Style map', () => {
  it('lists the drums and 16 families; the chosen one shows its programs and what decided them', async () => {
    const s = setup()
    expect(tipped('sound.map_family')).toHaveLength(17)
    expect(tipped('sound.export')).toHaveLength(1)
    // Family 0 is chosen: its 8 programs, each with its override picker.
    expect(tipped('sound.family')).toHaveLength(1)
    expect(tipped('sound.override_patch')).toHaveLength(8)
    await family(6)
    expect(tipped('sound.map_family')[7].getAttribute('aria-current')).toBe('true')
    const rows = s.state.soundLibrary.gmMap.filter((r) => r.family === 6)
    const words: Record<string, string> = { override: 'Override', family: 'Family', auto: 'Auto', none: 'Unset', drums: 'Drums' }
    expect(froms()).toEqual(rows.map((r) => words[r.resolved.layer]))
    expect(tipped('sound.map_program')[0].textContent).toContain(GM[48])
    // The drums: the drum rule and the kit row.
    await fireEvent.click(tipped('sound.map_family')[0])
    flushSync()
    expect(tipped('sound.drums')).toHaveLength(1)
    expect(tipped('sound.map_program')[0].textContent).toContain('Kit')
  })

  it('sets and clears family, override and drum rules, globally or for this style', async () => {
    const s = setup()
    await family(10)
    await pickIn(tipped('sound.family')[0], 'saved:warm-rhodes')
    expect(s.state.soundLibrary.map.families[10]).toBe('warm-rhodes')
    // The family's dot fills.
    expect(tipped('sound.map_family')[11].querySelector('.dot.ruled')).not.toBe(null)
    // An override on program 81: From says so; ✕ clears it.
    await pickIn(tipped('sound.override_patch')[0], 'saved:soft-pad')
    expect(s.state.soundLibrary.map.overrides.find((o) => o.program === 80)?.patch).toBe('soft-pad')
    expect(froms()[0]).toBe('Override')
    await pickIn(tipped('sound.override_patch')[0], null)
    expect(s.state.soundLibrary.map.overrides.some((o) => o.program === 80)).toBe(false)
    // "Set to auto" clears the family rule.
    await pickIn(tipped('sound.family')[0], null)
    expect(s.state.soundLibrary.map.families[10]).toBe(null)
    // The drum rule.
    await fireEvent.click(tipped('sound.map_family')[0])
    flushSync()
    await pickIn(tipped('sound.drums')[0], null)
    expect(s.state.soundLibrary.map.drums).toBe(null)
    // This style's own rule; the global map is untouched; Clear style map removes it.
    await family(4)
    const [, styleTab] = tipped('sound.scope')
    await fireEvent.click(styleTab)
    flushSync()
    expect(tipped('sound.family')[0].textContent).toContain('↳ Finger Bass')
    await pickIn(tipped('sound.family')[0], 'saved:soft-pad')
    expect(s.state.soundLibrary.styleMap.families[4]).toBe('soft-pad')
    expect(s.state.soundLibrary.map.families[4]).toBe('finger-bass')
    expect(document.querySelector('.style')).not.toBe(null)
    await fireEvent.click(tipped('sound.clear_style_map')[0])
    expect(s.state.soundLibrary.styleMap.families[4]).toBe(null)
  })

  it('Port sends mapped is a lamp', async () => {
    const s = setup()
    const lamp = tipped('sound.port_mapped')[0]
    await fireEvent.click(lamp)
    expect(s.state.soundLibrary.portSendsMapped).toBe(true)
  })

  it('every control has a tooltip; a picker opens the sound picker', async () => {
    setup()
    for (const c of document.querySelectorAll<HTMLElement>('button, select, input')) {
      expect(c.dataset.tip, c.outerHTML).toBeTruthy()
    }
    await fireEvent.click(tipped('sound.override_patch')[5])
    expect(ui.soundPick?.title).toBe(`Override for ${GM[5]}`)
  })

  it('browses a SoundFont, adds a preset, and adds and maps one to the chosen program', async () => {
    const s = setup()
    const select = tipped('sound.soundfont')[0] as HTMLSelectElement
    select.value = 'GeneralUser-GS.sf2'
    await fireEvent.change(select)
    flushSync()
    expect(s.state.soundLibrary.browse?.presets.length).toBeGreaterThan(128)
    const n = s.state.soundLibrary.patches.length
    await fireEvent.click(tipped('sound.preset_add')[33])
    expect(s.state.soundLibrary.patches).toHaveLength(n + 1)
    expect(s.state.soundLibrary.patches[n].category).toBe('bass')
    // Choose program 3 and a preset, then Add and map.
    await fireEvent.click(tipped('sound.map_program')[2])
    await fireEvent.click(tipped('sound.preset_pick')[10])
    flushSync()
    const map = tipped('sound.add_map')[0] as HTMLButtonElement
    expect(map.textContent).toBe('Add and map to 3')
    await fireEvent.click(map)
    expect(s.state.soundLibrary.patches).toHaveLength(n + 2)
    expect(s.state.soundLibrary.map.overrides.find((o) => o.program === 2)?.patch).toBe(s.state.soundLibrary.lastAdded)
  })

  it('a patch names its source', () => {
    const s = new MockSession({ manual: true })
    expect(sourceText(s.state.soundLibrary.patches[3])).toBe('GeneralUser-GS · drum kit 1')
    expect(sourceText(s.state.soundLibrary.patches[2])).toBe('GeneralUser-GS · 0:34')
  })
})

describe('library patches on a part (mock session)', () => {
  it('a plugin patch on a part plays its plugin, until the part leaves the patch', () => {
    const s = new MockSession({ manual: true })
    s.send({ type: 'setPartPatch', part: 0, id: 'keys-au' })
    const r1 = () => s.state.keyboardParts[0]
    expect(r1().patch).toBe('keys-au')
    expect(r1().voiceName).toBe('Keys (AU)')
    expect(r1().plugin?.id).toBe('aumu dls  appl')
    // A SoundFont patch: the plugin goes.
    s.send({ type: 'setPartPatch', part: 0, id: 'stage-grand' })
    expect(r1().plugin).toBeUndefined()
    // A GM voice ends a plugin patch and its plugin.
    s.send({ type: 'setPartPatch', part: 0, id: 'keys-au' })
    s.send({ type: 'setPartVoice', part: 0, program: 0 })
    expect([r1().patch, r1().plugin]).toEqual([null, undefined])
    // A plugin picked on the Plugins tab ends the patch, and stays when a patch is left.
    s.send({ type: 'setPartPatch', part: 0, id: 'keys-au' })
    s.send({ type: 'setPartPlugin', part: 0, id: 'aumu dls  appl', state: null })
    expect([r1().patch, r1().plugin?.id]).toEqual([null, 'aumu dls  appl'])
  })
})
