// Quick Racks on the mock session (docs/racks.md item 6): the bar's buttons load racks and
// light like pad page 4, Store puts the live rack on a button (saving it first when it has
// to), the unsaved-changes prompt asks in the Rack panel, banks step, Clear empties; Library › Racks, page 4's pads
// and Shift + Track run the same commands.

import { cleanup, fireEvent, render } from '@testing-library/svelte'
import { flushSync } from 'svelte'
import type { Action } from 'svelte/action'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from '../../App.svelte'
import { BINDINGS } from '../../lib/keys'
import { NAV } from '../../lib/nav'
import { MockSession } from '../../lib/api/mock'
import { quickLook } from '../../lib/api/quick-racks'
import { app, ui } from '../../lib/store.svelte'
import KnobRackPanel from '../knobracks/KnobRackPanel.svelte'
import Launchkey from '../launchkey/Launchkey.svelte'
import { tip } from '../../lib/tooltip/tip.svelte'
import { stagePage } from '../stage/page.svelte'
import QuickRacksPage from './QuickRacksPage.svelte'

/** The Quick Racks page tab, alone (StageScreen puts it in the Stage's display box). */
const renderPage = () =>
  render(QuickRacksPage, { props: { tipAction: tip as unknown as Action<HTMLElement, string> } })

/** The app on session `s` with the Quick Racks page tab chosen: the page in the Stage's display box, and the Rack drawer. */
function renderApp(s: MockSession) {
  stagePage.page = 'quickRacks'
  render(App, { props: { session: s } })
  flushSync()
}

function setup() {
  const session = new MockSession({ manual: true })
  app.attach(session)
  return session
}

const q = <T extends Element = HTMLButtonElement>(sel: string) => document.querySelector<T>(sel)!
const tipped = <T extends Element = HTMLButtonElement>(key: string) => [...document.querySelectorAll<T>(`[data-tip="${key}"]`)]
/** The stage's Quick Racks row (panels/knobracks). */
const STAGE = 'section[aria-label="Quick Racks"]'
const names = () => [...document.querySelectorAll('.slot .text')].map((e) => e.textContent)
/** The bank letter on view: the chosen bank tab. */
const letter = () => q('[aria-label="Quick Racks bank"] [aria-selected="true"]').textContent?.trim()
const bankTab = (l: string) => q(`[role="tab"][aria-label="Bank ${l}"]`)

async function click(el: Element) {
  await fireEvent.click(el)
  flushSync()
}

/** Store the live rack on button `slot` as a new rack `name`, through the bar. */
async function storeAs(slot: number, name: string) {
  await click(tipped('quick.store')[0])
  await click(tipped(`quick.${slot + 1}`)[0])
  const input = q<HTMLInputElement>('[data-tip="quick.save_name"]')
  await fireEvent.input(input, { target: { value: name } })
  await click(tipped('quick.save')[0])
}

afterEach(() => {
  vi.restoreAllMocks()
  cleanup()
  app.detach()
  ui.view = 'stage'
  ui.rack = false
  stagePage.page = 'stage'
})

describe('Quick Racks page', () => {
  it('replaces the Registration bar, in the Quick Racks row (panels/knobracks)', () => {
    app.attach(new MockSession({ demo: true, manual: true }))
    render(KnobRackPanel)
    flushSync()
    const bar = q<HTMLElement>(STAGE)
    expect(document.querySelector('section[aria-label="Registration"]')).toBeNull()
    // Bank ◀ ▶, eight buttons and Store; no Freeze, Sequence, Playlist or Panel.
    expect(bar.querySelectorAll('[data-tip^="quick."]').length).toBeGreaterThanOrEqual(11)
    expect(bar.textContent).not.toMatch(/Freeze|Sequence|Playlist|Panel/)
  })

  it('starts on bank A with eight empty buttons', () => {
    setup()
    renderPage()
    expect(letter()).toBe('A')
    expect(names()).toEqual(Array(8).fill('Empty'))
    expect(tipped('quick.clear')).toHaveLength(0)
  })

  it('Store on a never-saved rack asks its name, saves it and stores it on the button', async () => {
    const s = setup()
    renderPage()
    await click(tipped('quick.store')[0])
    expect(s.state.quickRacks.store).toBe(true)
    expect(quickLook(s.state.quickRacks, 5).anim).toBe('flash')
    await click(tipped('quick.3')[0])
    // Nothing stored yet: the button waits for the save, and the bar asks.
    expect(s.state.quickRacks.storeWaiting).toBe(2)
    expect(s.state.quickRacks.buttons[2].rack).toBeNull()
    expect(q('[aria-label="Save the rack to store it on A3"]').textContent).toContain('A3 waiting for Save · name the new rack')
    expect(q('[data-tip="quick.3"]').getAttribute('aria-label')).toBe('Quick Rack A3, empty, waiting for Save')
    const input = q<HTMLInputElement>('[data-tip="quick.save_name"]')
    expect(input.value).toBe('New rack')
    await fireEvent.input(input, { target: { value: 'Ballad' } })
    await click(tipped('quick.save')[0])
    const qr = s.state.quickRacks
    expect(s.state.racks.map((r) => r.name)).toEqual(['Ballad'])
    expect(qr).toMatchObject({ store: false, storeWaiting: null })
    expect(qr.buttons[2]).toMatchObject({ rack: s.state.racks[0].id, name: 'Ballad', loaded: true, missing: false })
    expect(quickLook(qr, 2)).toMatchObject({ rgb: [127, 0, 0], anim: 'solid' })
    expect(names()[2]).toBe('Ballad')
  })

  it('Store with a saved, unmodified rack stores at once; a modified one is saved first', async () => {
    const s = setup()
    renderPage()
    await storeAs(0, 'Ballad')
    await click(tipped('quick.store')[0])
    await click(tipped('quick.2')[0])
    expect(s.state.quickRacks.buttons[1]).toMatchObject({ name: 'Ballad', loaded: true })
    expect(s.state.quickRacks.store).toBe(false)
    // Changed since: Save (over Ballad) first, then it goes on the button.
    s.send({ type: 'setPartVoice', part: 0, program: 12 })
    flushSync()
    await click(tipped('quick.store')[0])
    await click(tipped('quick.4')[0])
    expect(s.state.quickRacks.storeWaiting).toBe(3)
    expect(q('[aria-label="Save the rack to store it on A4"]').textContent).toContain('A4 waiting for Save · Ballad modified')
    expect(tipped('quick.save_name')).toHaveLength(0)
    await click(tipped('quick.save')[0])
    expect(s.state.liveRack).toMatchObject({ name: 'Ballad', modified: false })
    expect(s.state.racks).toHaveLength(1)
    expect(s.state.quickRacks.buttons[3].name).toBe('Ballad')
  })

  it('Cancel while waiting disarms Store and stores nothing', async () => {
    const s = setup()
    renderPage()
    await click(tipped('quick.store')[0])
    await click(tipped('quick.1')[0])
    await click(tipped('quick.cancel_store')[0])
    expect(s.state.quickRacks).toMatchObject({ store: false, storeWaiting: null })
    expect(s.state.racks).toHaveLength(0)
    expect(tipped('quick.1')).toHaveLength(1)
  })

  it('a waiting Store whose save needs sound names asks them in the Rack drawer, then saves and stores', async () => {
    const s = setup()
    // The Quick Racks page tab, in the app: its Rack drawer opens over the Stage.
    renderApp(s)
    s.send({ type: 'listPluginPresets', id: 'au:aumu Smp7 Fake' })
    s.send({ type: 'setPartPluginPreset', part: 0, id: 'aumu Smp7 Fake', preset: 'f:1' })
    s.advance(5000)
    s.pluginWindow(0, 5)
    flushSync()
    await storeAs(0, 'Grand')
    expect(s.state.liveRack.prompt).toMatchObject({ kind: 'soundNames', saveAs: 'Grand' })
    expect(s.state.quickRacks.storeWaiting).toBe(0)
    // Asked once, in the Rack panel, which the bar opened.
    expect(ui.rack).toBe(true)
    expect(document.querySelectorAll(`${STAGE} [data-tip^="rack."]`)).toHaveLength(0)
    const field = q<HTMLInputElement>('[data-tip="rack.sound_name"]')
    expect(field.value).toBe('Bright Grand')
    await fireEvent.input(field, { target: { value: 'My Grand' } })
    await click(tipped('rack.save_names')[0])
    expect(s.state.liveRack).toMatchObject({ name: 'Grand', modified: false, prompt: null })
    expect(s.state.keyboardParts[0].sound?.name).toBe('My Grand')
    expect(s.state.quickRacks.buttons[0]).toMatchObject({ name: 'Grand', loaded: true })
  })

  it('a button loads its rack; with unsaved changes the Rack drawer opens and asks: Keep editing, Discard and switch, Save first', async () => {
    const s = setup()
    // The Quick Racks page tab, in the app (as above).
    renderApp(s)
    s.send({ type: 'setPartVoice', part: 0, program: 40 })
    await storeAs(0, 'Strings')
    const strings = s.state.liveRack.id!
    s.send({ type: 'newRack' })
    flushSync()
    expect(s.state.quickRacks.buttons[0].loaded).toBe(false)
    await click(tipped('quick.1')[0])
    expect(s.state.liveRack.id).toBe(strings)
    expect(s.state.keyboardParts[0].program).toBe(40)
    expect(s.state.quickRacks.buttons[0].loaded).toBe(true)
    expect(ui.rack).toBe(false)

    s.send({ type: 'newRack' })
    s.send({ type: 'setPartVoice', part: 0, program: 5 })
    flushSync()
    await click(tipped('quick.1')[0])
    expect(s.state.liveRack.prompt).toEqual({ kind: 'unsavedChanges', then: { kind: 'load', id: strings, name: 'Strings' } })
    // The prompt is asked in one place: the Rack drawer, not the bar.
    expect(ui.rack).toBe(true)
    expect(q(STAGE).textContent).not.toContain('Strings?')
    expect(document.querySelectorAll('[role="alert"]').length).toBeGreaterThan(0)
    expect(tipped('rack.keep_editing')).toHaveLength(1)
    await click(tipped('rack.keep_editing')[0])
    expect(s.state.liveRack).toMatchObject({ id: null, modified: true, prompt: null })

    await click(tipped('quick.1')[0])
    await click(tipped('rack.discard_switch')[0])
    expect(s.state.liveRack).toMatchObject({ id: strings, modified: false, prompt: null })
    expect(s.state.racks).toHaveLength(1)

    s.send({ type: 'newRack' })
    s.send({ type: 'setPartVoice', part: 0, program: 7 })
    flushSync()
    await click(tipped('quick.1')[0])
    await click(tipped('rack.save_first')[0])
    // The new rack is saved (as "New rack"), then the engine makes the held switch.
    expect(s.state.racks.map((r) => r.name)).toEqual(['New rack', 'Strings'])
    expect(s.state.liveRack).toMatchObject({ id: strings, modified: false, prompt: null })
    expect(s.state.keyboardParts[0].program).toBe(40)
  })

  it('a tap on another stored rack with unsaved changes asks first, in the Rack drawer', async () => {
    const s = setup()
    renderApp(s)
    s.send({ type: 'setPartVoice', part: 0, program: 40 })
    await storeAs(2, 'Strings')
    s.send({ type: 'newRack' })
    s.send({ type: 'setPartVoice', part: 0, program: 1 })
    flushSync()
    await storeAs(0, 'Ballad')
    s.send({ type: 'setPartVoice', part: 0, program: 12 })
    flushSync()
    expect(s.state.liveRack).toMatchObject({ name: 'Ballad', modified: true })
    await click(tipped('quick.3')[0])
    expect(s.state.liveRack.prompt).toMatchObject({ kind: 'unsavedChanges', then: { kind: 'load', name: 'Strings' } })
    expect(ui.rack).toBe(true)
    const alert = document.querySelector('[role="alert"].unsaved')
    expect(alert?.textContent).toContain('The rack has unsaved changes: save them before loading Strings?')
  })

  it('a tap on the lit rack recalls it clean with no prompt, keeping the changes as "Recovered: <name>"', async () => {
    const s = setup()
    renderApp(s)
    await storeAs(0, 'Ballad')
    s.send({ type: 'setPartVoice', part: 0, program: 12 })
    flushSync()
    const sent = vi.spyOn(s, 'send')
    await click(tipped('quick.1')[0])
    expect(sent.mock.calls.map(([c]) => c)).toEqual([{ type: 'pressQuickRack', slot: 0 }])
    expect(s.state.liveRack).toMatchObject({ name: 'Ballad', modified: false, prompt: null })
    expect(ui.rack).toBe(false)
    expect(s.state.racks.map((r) => r.name)).toContain('Recovered: Ballad')
  })

  it('after a store over a button, Undo shows what it undoes and takes it back (undoQuickRackStore)', async () => {
    const s = setup()
    renderPage()
    s.send({ type: 'setPartVoice', part: 0, program: 40 })
    await storeAs(2, 'Strings')
    s.send({ type: 'newRack' })
    s.send({ type: 'setPartVoice', part: 0, program: 1 })
    flushSync()
    await storeAs(0, 'Ballad')
    // The last store (Ballad on A1) is the one Undo names.
    expect(tipped('quick.undo').map((b) => b.textContent?.trim())).toEqual(['Undo store on A1'])
    await fireEvent.contextMenu(tipped('quick.3')[0])
    flushSync()
    expect(s.state.quickRacks.buttons[2].name).toBe('Ballad')
    const undo = tipped('quick.undo')
    expect(undo).toHaveLength(1)
    expect(undo[0].textContent).toContain('Undo store on A3')
    const sent = vi.spyOn(s, 'send')
    await click(undo[0])
    expect(sent.mock.calls.map(([c]) => c)).toEqual([{ type: 'undoQuickRackStore' }])
    expect(s.state.quickRacks.buttons[2].name).toBe('Strings')
    expect(tipped('quick.undo')).toHaveLength(0)
  })

  it('a bank letter sends one setQuickRackBank, however far away', async () => {
    const s = setup()
    renderPage()
    const sent = vi.spyOn(s, 'send')
    await click(bankTab('F'))
    expect(sent.mock.calls.map(([c]) => c)).toEqual([{ type: 'setQuickRackBank', bank: 5 }])
  })

  it('an empty button says so; a bank letter shows that bank, any distance away', async () => {
    const s = setup()
    renderPage()
    await click(tipped('quick.5')[0])
    expect(s.state.message).toMatchObject({ error: true, text: 'Quick Rack A5 is empty' })
    await click(bankTab('B'))
    expect(s.state.quickRacks.bank).toBe(1)
    expect(letter()).toBe('B')
    await click(bankTab('H'))
    expect(s.state.quickRacks.bank).toBe(7)
    expect(letter()).toBe('H')
    expect(names()[0]).toBe('Empty')
    expect(q('[data-tip="quick.1"]').getAttribute('aria-label')).toBe('Quick Rack H1, empty')
    await click(bankTab('A'))
    expect(s.state.quickRacks.bank).toBe(0)
  })

  it('each bank has its own buttons, and ✕ clears one', async () => {
    const s = setup()
    renderPage()
    await storeAs(0, 'Ballad')
    await click(bankTab('B'))
    expect(s.state.quickRacks.buttons[0].rack).toBeNull()
    await click(tipped('quick.store')[0])
    await click(tipped('quick.8')[0])
    expect(s.state.quickRacks.buttons[7].name).toBe('Ballad')
    await click(bankTab('A'))
    expect(names()[0]).toBe('Ballad')
    await click(tipped('quick.clear')[0])
    expect(s.state.quickRacks.buttons[0].rack).toBeNull()
    await click(bankTab('B'))
    expect(s.state.quickRacks.buttons[7].name).toBe('Ballad')
  })

  it('the lit one is the solid block, with the modified dot once it changes; Lit names it', async () => {
    const s = setup()
    renderPage()
    await storeAs(1, 'Ballad')
    const a2 = q('[data-tip="quick.2"]')
    expect(a2.getAttribute('aria-label')).toBe('Quick Rack A2, Ballad, loaded')
    expect(a2.dataset.face).toBe('chosen')
    expect(document.querySelector('section[aria-label="Quick Racks"]')!.textContent).toContain('Lit A2')
    s.send({ type: 'setPartVoice', part: 0, program: 12 })
    flushSync()
    expect(a2.getAttribute('aria-label')).toBe('Quick Rack A2, Ballad, loaded, modified')
  })

  it('a long press or right-click saves the live rack over a button in one step (storeRack)', async () => {
    const s = setup()
    renderPage()
    await storeAs(0, 'Ballad')
    s.send({ type: 'setPartVoice', part: 0, program: 12 })
    flushSync()
    await fireEvent.contextMenu(tipped('quick.3')[0])
    flushSync()
    expect(s.state.quickRacks.buttons[2]).toMatchObject({ loaded: true })
    expect(s.state.quickRacks.store).toBe(false)
  })

  it('Rack ◀ ▶ step through the stored racks of the bank', async () => {
    const s = setup()
    renderPage()
    await storeAs(0, 'Ballad')
    s.send({ type: 'newRack', discard: true })
    s.send({ type: 'setPartVoice', part: 0, program: 40 })
    flushSync()
    await storeAs(2, 'Strings')
    await click(tipped('quick.prev')[0])
    expect(s.state.liveRack.name).toBe('Ballad')
    expect(s.state.quickRacks.buttons[0].loaded).toBe(true)
    await click(tipped('quick.next')[0])
    expect(s.state.liveRack.name).toBe('Strings')
  })

  it('One Touch: a press applies it, the select picks what it loads, Link and its timing switch', async () => {
    const s = new MockSession({ demo: true, manual: true })
    app.attach(s)
    renderPage()
    await storeAs(0, 'Ballad')
    const ballad = s.state.liveRack.id!
    await click(tipped('ots.2')[0])
    expect(s.state.ots.applied).toBe(2)
    expect(tipped('ots.2')[0].getAttribute('aria-pressed')).toBe('true')
    const pick = tipped<HTMLSelectElement>('ots.rack')[0]
    await fireEvent.change(pick, { target: { value: ballad } })
    flushSync()
    expect(s.state.ots.racks[0]).toMatchObject({ rack: ballad, name: 'Ballad' })
    expect(tipped<HTMLSelectElement>('ots.rack')[0].value).toBe(ballad)
    await fireEvent.change(tipped<HTMLSelectElement>('ots.rack')[0], { target: { value: '' } })
    flushSync()
    expect(s.state.ots.racks[0].rack).toBeNull()
    const link = s.state.ots.link
    await click(tipped('ots.link')[0])
    expect(s.state.ots.link).toBe(!link)
    const [immediate] = tipped('ots.link_timing')
    await click(immediate)
    expect(s.state.ots.linkTiming).toBe('immediate')
  })

  it('Library › Racks opens the Library on its Racks page', async () => {
    setup()
    renderPage()
    await click(tipped('quick.library')[0])
    expect(ui.view).toBe('library')
    expect(ui.libraryTab).toBe('racks')
  })
})

describe('Quick Racks in the mock', () => {
  function withRacks() {
    const s = new MockSession({ manual: true })
    const store = (slot: number, name: string, program: number) => {
      s.send({ type: 'setPartVoice', part: 0, program })
      s.send({ type: 'toggleQuickRackStore' })
      s.send({ type: 'pressQuickRack', slot })
      s.send({ type: 'saveRackAs', name })
    }
    store(1, 'One', 10)
    store(4, 'Two', 20)
    s.send({ type: 'newRack' })
    return s
  }

  it('Rack −/+ step the stored buttons from the lit one, and stop at the ends', () => {
    const s = withRacks()
    const lit = () => s.state.quickRacks.buttons.findIndex((b) => b.loaded)
    s.send({ type: 'stepQuickRack', delta: 1 })
    expect(lit()).toBe(1)
    s.send({ type: 'stepQuickRack', delta: 1 })
    expect(lit()).toBe(4)
    s.send({ type: 'stepQuickRack', delta: 1 })
    expect(lit()).toBe(4)
    s.send({ type: 'stepQuickRack', delta: -1 })
    expect(lit()).toBe(1)
    expect(s.state.keyboardParts[0].program).toBe(10)
    s.send({ type: 'newRack' })
    s.send({ type: 'stepQuickRack', delta: -1 })
    expect(lit()).toBe(4)
    s.send({ type: 'stepQuickRackBank', delta: 1 })
    s.send({ type: 'stepQuickRack', delta: 1 })
    expect(s.state.message).toMatchObject({ error: true, text: 'Bank B has no racks' })
  })

  it('Regist 9 and 10 run on into the next bank; the pedal functions run Quick Racks', () => {
    const s = withRacks()
    s.send({ type: 'toggleQuickRackStore' })
    s.send({ type: 'pressQuickRack', slot: 9 })
    s.send({ type: 'saveRackAs', name: 'Three' })
    s.send({ type: 'stepQuickRackBank', delta: 1 })
    expect(s.state.quickRacks.buttons[1].name).toBe('Three')
    s.send({ type: 'stepQuickRackBank', delta: -1 })
    s.send({ type: 'triggerFunction', function: 'regist2' })
    expect(s.state.liveRack.name).toBe('One')
    s.send({ type: 'triggerFunction', function: 'registNext' })
    expect(s.state.liveRack.name).toBe('Two')
    s.send({ type: 'triggerFunction', function: 'registMemory' })
    expect(s.state.quickRacks.store).toBe(true)
    s.send({ type: 'triggerFunction', function: 'snapshotBankNext' })
    expect(s.state.quickRacks.bank).toBe(1)
  })

  it('deleting a rack empties its buttons; dismissing the prompt lets a waiting Store go', () => {
    const s = withRacks()
    const one = s.state.quickRacks.buttons[1].rack!
    s.send({ type: 'deleteRack', id: one })
    expect(s.state.quickRacks.buttons[1].rack).toBeNull()
    expect(s.state.quickRacks.buttons[4].name).toBe('Two')
    s.send({ type: 'toggleQuickRackStore' })
    s.send({ type: 'pressQuickRack', slot: 0 })
    expect(s.state.quickRacks.storeWaiting).toBe(0)
    s.send({ type: 'dismissRackPrompt' })
    expect(s.state.quickRacks.storeWaiting).toBeNull()
  })

  it('pad page 2 (Racks): Quick 1–8, OTS 1–4, Bank −/+, Store and a dark pad, with its lamps', () => {
    const s = new MockSession({ manual: true })
    s.send({ type: 'setPadPage', page: 'racks' })
    const pad = (n: number) => s.state.pads.pads.find((p) => p.note === n)!
    expect(s.state.pads.pageName).toBe('Racks')
    expect([pad(96).label, pad(96).key, pad(96).action]).toEqual(['QUICK 1', '⇧Q', { type: 'pressQuickRack', slot: 0 }])
    expect([pad(103).label, pad(103).key]).toEqual(['QUICK 8', '⇧I'])
    expect([pad(112).label, pad(112).key, pad(112).action]).toEqual(['OTS 1', '⇧1', { type: 'recallOts', index: 0 }])
    expect([pad(115).label, pad(115).key]).toEqual(['OTS 4', '⇧4'])
    expect([pad(116).action, pad(116).key, pad(116).level, pad(117).level]).toEqual([{ type: 'stepQuickRackBank', delta: -1 }, '⇧O', 'off', 'dim'])
    expect([pad(118).label, pad(118).key, pad(118).action]).toEqual(['STORE', 'F5', { type: 'toggleQuickRackStore' }])
    expect([pad(119).label, pad(119).key, pad(119).action, pad(119).level]).toEqual(['UNDO', '', { type: 'undoQuickRackStore' }, 'off'])
    s.send({ type: 'toggleQuickRackStore' })
    expect([pad(96).anim, pad(118).anim]).toEqual(['flash', 'flash'])
    s.send({ type: 'pressQuickRack', slot: 0 })
    s.send({ type: 'saveRackAs', name: 'Ballad' })
    s.send({ type: 'newRack' })
    expect([pad(96).rgb, pad(96).level, pad(97).level, pad(118).level]).toEqual([[0, 40, 127], 'bright', 'off', 'dim'])
    s.send({ type: 'pressQuickRack', slot: 0 })
    expect([pad(96).rgb, pad(96).level]).toEqual([[127, 0, 0], 'bright'])
    for (let i = 0; i < 7; i++) s.send({ type: 'stepQuickRackBank', delta: 1 })
    expect([pad(116).level, pad(117).level]).toEqual(['dim', 'off'])
  })

  it('Shift + Track is the previous/next Quick Rack, dark while the bank has none', () => {
    const s = new MockSession({ manual: true })
    const c = (id: string) => s.state.surface.controls.find((x) => x.id === id)!
    expect([c('trackPrev').shiftLabel, c('trackPrev').shiftAction]).toEqual(['', null])
    s.send({ type: 'toggleQuickRackStore' })
    s.send({ type: 'pressQuickRack', slot: 5 })
    s.send({ type: 'saveRackAs', name: 'Ballad' })
    expect([c('trackPrev').shiftLabel, c('trackPrev').shiftAction]).toEqual(['◀ RACK', { type: 'stepQuickRack', delta: -1 }])
    expect([c('trackNext').shiftLabel, c('trackNext').shiftAction]).toEqual(['RACK ▶', { type: 'stepQuickRack', delta: 1 }])
  })

  it('the keys: Shift + Q–I press, O/P step the bank, F5 Store, F7/F8 Rack −/+', () => {
    expect(BINDINGS.Q).toEqual({ cmd: { type: 'pressQuickRack', slot: 0 } })
    expect(BINDINGS.I).toEqual({ cmd: { type: 'pressQuickRack', slot: 7 } })
    expect(BINDINGS.O).toEqual({ cmd: { type: 'stepQuickRackBank', delta: -1 } })
    expect(BINDINGS.P).toEqual({ cmd: { type: 'stepQuickRackBank', delta: 1 } })
    expect(BINDINGS.F5).toEqual({ cmd: { type: 'toggleQuickRackStore' } })
    expect(BINDINGS.F7).toEqual({ cmd: { type: 'stepQuickRack', delta: -1 } })
    expect(BINDINGS.F8).toEqual({ cmd: { type: 'stepQuickRack', delta: 1 } })
    for (const k of ['F6', 'F11', 'F12', '<', '>']) expect(BINDINGS[k], k).toBeUndefined()
  })

  it('a Racks page pad on the mirror loads its rack', async () => {
    const s = setup()
    s.send({ type: 'toggleQuickRackStore' })
    s.send({ type: 'pressQuickRack', slot: 2 })
    s.send({ type: 'saveRackAs', name: 'Organ' })
    s.send({ type: 'newRack' })
    s.send({ type: 'setPadPage', page: 'racks' })
    flushSync()
    render(Launchkey)
    await click(q('.pad[data-note="98"]'))
    expect(s.state.liveRack.name).toBe('Organ')
    expect(s.state.quickRacks.buttons[2].loaded).toBe(true)
  })
})

describe('Library › Racks', () => {
  it('opens from nav "Quick Racks" (Alt+R) and loads your racks (double-click), labelled with their Quick Rack button', async () => {
    const s = setup()
    render(App, { props: { session: s } })
    s.send({ type: 'toggleQuickRackStore' })
    s.send({ type: 'pressQuickRack', slot: 0 })
    s.send({ type: 'saveRackAs', name: 'Ballad' })
    s.send({ type: 'newRack' })
    s.send({ type: 'setPartVoice', part: 0, program: 3 })
    flushSync()
    // The quick-nav strip isn't routed in the Stage shell any more; its Alt key still is.
    expect(NAV.find((n) => n.label === 'Quick Racks')!.key).toBe('alt+r')
    await fireEvent.keyDown(window, { key: 'r', code: 'KeyR', altKey: true })
    flushSync()
    expect(ui.view).toBe('library')
    expect(ui.libraryTab).toBe('racks')
    const rack = tipped('library.rack_row').filter((el) => el.getAttribute('role') === 'option')
    expect(rack.map((b) => b.textContent)).toEqual([expect.stringContaining('Ballad')])
    expect(rack[0].textContent).toContain('A1')
    await fireEvent.dblClick(rack[0])
    flushSync()
    // The prompt is asked in the Rack drawer, which opens over Library.
    expect(ui.rack).toBe(true)
    expect(tipped('rack.discard_switch')).toHaveLength(1)
    await click(tipped('rack.discard_switch')[0])
    expect(s.state.liveRack).toMatchObject({ name: 'Ballad', modified: false })
  })
})
