import { cleanup, fireEvent, render, within } from '@testing-library/svelte'
import { flushSync } from 'svelte'
import type { Action } from 'svelte/action'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MockSession } from '../../lib/api/mock'
import { binding } from '../../lib/keys'
import { app } from '../../lib/store.svelte'
import { loadPadFile, multiPadsCommand, multiPadsData, PAD_FILE, type MultiPadsCommandChange } from './model'
import MultiPadsPage from './MultiPadsPage.svelte'

// The system file picker: each test says what it answers (a path, or null for a cancel).
const picked = vi.hoisted(() => vi.fn<(p: unknown) => Promise<string | null>>(async () => null))
vi.mock('../../lib/files', async (actual) => ({ ...(await actual<typeof import('../../lib/files')>()), pickFile: picked }))

const noTip: Action<HTMLElement, string> = () => {}

function setup() {
  const session = new MockSession({ manual: true })
  app.attach(session)
  flushSync()
  render(MultiPadsPage, { tipAction: noTip })
  return session
}

afterEach(() => {
  cleanup()
  app.detach()
  picked.mockClear()
})

const page = () => within(document.querySelector<HTMLElement>('[aria-label="Multi Pads page"]')!)
const pad = (n: number) => page().getByRole('button', { name: new RegExp(`^Pad ${n}:`) })
const faces = () => [1, 2, 3, 4].map((n) => pad(n).dataset.face)
const click = async (name: string | RegExp) => {
  await fireEvent.click(page().getByRole('button', { name }))
  flushSync()
}

describe('multiPadsData', () => {
  it('maps the bank list, the loaded bank, the pads, the volume and the flash phase', () => {
    const s = new MockSession({ manual: true }).state
    s.multiPad.bank = { id: 1, name: 'Latin Perc', path: 'x.pad' }
    s.mixer.multiPadVolume = 66
    s.mixer.multiPadVolumeWaiting = true
    const d = multiPadsData(s, 3.2)
    expect(d.bank).toBe('1')
    expect(d.bankName).toBe('Latin Perc')
    expect(d.banks.map((b) => b.id)).toEqual(s.multiPad.banks.map((b) => String(b.id)))
    expect(d.pads).toHaveLength(4)
    expect(d.volume).toBe(66)
    expect(d.volumeWaiting).toBe(true)
    expect(d.lit).toBe(true)
    expect(multiPadsData(s, 3.7).lit).toBe(false)
    s.multiPad.bank = null
    expect(multiPadsData(s, 0)).toMatchObject({ bank: null, bankName: '' })
  })
})

describe('multiPadsCommand', () => {
  it('sends each request as its command', () => {
    const cases: [MultiPadsCommandChange, unknown][] = [
      [{ type: 'play', pad: 2 }, { type: 'triggerMultiPad', pad: 2 }],
      [{ type: 'stop', pad: 1 }, { type: 'stopMultiPad', pad: 1 }],
      [{ type: 'select', pad: 3 }, { type: 'armMultiPad', pad: 3 }],
      [{ type: 'stopAll' }, { type: 'stopAllMultiPads' }],
      [{ type: 'repeat', pad: 0, on: true }, { type: 'setMultiPadRepeat', pad: 0, on: true }],
      [{ type: 'chordMatch', pad: 0, on: false }, { type: 'setMultiPadChordMatch', pad: 0, on: false }],
      [{ type: 'bank', id: '4' }, { type: 'loadMultiPad', id: 4 }],
      [{ type: 'clear' }, { type: 'clearMultiPad' }],
      [{ type: 'volume', volume: 80 }, { type: 'setMultiPadVolume', volume: 80 }],
      [{ type: 'synchroStop', styleStop: false, ending: true }, { type: 'setMultiPadSynchroStop', styleStop: false, ending: true }],
    ]
    for (const [change, cmd] of cases) expect(multiPadsCommand(change)).toEqual(cmd)
  })
})

describe('Load…', () => {
  it('asks the file picker for a .pad file and loads the path picked', async () => {
    const send = vi.fn()
    const pick = vi.fn(async () => '/Users/me/Pads/Funk.pad')
    expect(await loadPadFile(send, pick)).toBeNull()
    expect(pick).toHaveBeenCalledWith(PAD_FILE)
    expect(PAD_FILE.filter.extensions).toEqual(['pad'])
    expect(send).toHaveBeenCalledExactlyOnceWith({ type: 'loadMultiPadPath', path: '/Users/me/Pads/Funk.pad' })
  })

  it('sends nothing when the picker is cancelled', async () => {
    const send = vi.fn()
    expect(await loadPadFile(send, async () => null)).toBeNull()
    expect(send).not.toHaveBeenCalled()
  })

  it('a picker failure sends nothing and resolves to the line to show', async () => {
    const send = vi.fn()
    const failed = await loadPadFile(send, async () => {
      throw new Error('dialog.open not allowed')
    })
    expect(failed).toBe("The file picker didn't open: dialog.open not allowed")
    expect(send).not.toHaveBeenCalled()
  })

  it('on the page, a picker failure shows why under the bank tools until the next request', async () => {
    const s = setup()
    const sent = vi.spyOn(s, 'send')
    picked.mockRejectedValueOnce(new Error('dialog.open not allowed'))
    await click('Load a bank file')
    await vi.waitFor(() => expect(page().getByRole('alert').textContent).toBe("The file picker didn't open: dialog.open not allowed"))
    expect(sent).not.toHaveBeenCalled()
    await click('Next bank')
    expect(page().queryByRole('alert')).toBeNull()
  })

  it('the page button opens the picker and sends loadMultiPadPath; a cancel sends nothing', async () => {
    const s = setup()
    const sent = vi.spyOn(s, 'send')
    picked.mockResolvedValueOnce('/Users/me/Pads/Funk.pad')
    await click('Load a bank file')
    await vi.waitFor(() => expect(sent).toHaveBeenCalledWith({ type: 'loadMultiPadPath', path: '/Users/me/Pads/Funk.pad' }))
    expect(picked).toHaveBeenCalledWith(PAD_FILE)
    sent.mockClear()
    picked.mockResolvedValueOnce(null)
    await click('Load a bank file')
    await vi.waitFor(() => expect(picked).toHaveBeenCalledTimes(2))
    await Promise.resolve()
    expect(sent).not.toHaveBeenCalled()
  })
})

describe('Multi Pads page', () => {
  it('a bank from the list names and lights its pads; Clear bank darkens them', async () => {
    const s = setup()
    expect(faces()).toEqual(['dark', 'dark', 'dark', 'dark'])
    await click(/Latin Perc/)
    expect(faces()).toEqual(['idle', 'idle', 'idle', 'dark'])
    expect(pad(1).getAttribute('aria-label')).toContain('Conga Loop')
    expect(page().getByRole('button', { name: /Latin Perc/ }).getAttribute('aria-current')).toBe('true')
    await click('Clear bank')
    expect(s.state.multiPad.bank).toBeNull()
    expect(faces()).toEqual(['dark', 'dark', 'dark', 'dark'])
  })

  it('the pager steps through the banks', async () => {
    const s = setup()
    await click('Next bank')
    expect(s.state.multiPad.bank?.id).toBe(s.state.multiPad.banks[0].id)
    await click('Next bank')
    expect(s.state.multiPad.bank?.id).toBe(s.state.multiPad.banks[1].id)
    await click('Previous bank')
    expect(s.state.multiPad.bank?.id).toBe(s.state.multiPad.banks[0].id)
  })

  it('a pad plays at once when stopped, waits for the bar while the band plays, Stop and Stop all stop', async () => {
    const s = setup()
    await click(/Demo/)
    await fireEvent.click(pad(1))
    flushSync()
    expect(faces()[0]).toBe('playing')
    await click('Stop pad 1')
    expect(faces()[0]).toBe('idle')
    s.send({ type: 'startStop' })
    await fireEvent.click(pad(3))
    flushSync()
    expect(faces()[2]).toBe('next')
    s.advance((60000 / s.state.transport.tempo) * s.state.transport.beatsPerBar + 50)
    flushSync()
    expect(faces()[2]).toBe('playing')
    await click('Stop all')
    expect(faces()).toEqual(['idle', 'idle', 'idle', 'idle'])
  })

  it('Select arms a pad; Repeat, Chord Match, Synchro Stop and the volume send theirs', async () => {
    const s = setup()
    s.send({ type: 'loadMultiPad', id: 0 })
    flushSync()
    await click('Select pad 2: Synchro Start')
    expect(faces()[1]).toBe('armed')
    expect(page().getByRole('button', { name: 'Select pad 2: Synchro Start' }).getAttribute('aria-pressed')).toBe('true')
    const repeat = s.state.multiPad.pads[1].repeat
    await click('Repeat pad 2')
    expect(s.state.multiPad.pads[1].repeat).toBe(!repeat)
    const match = s.state.multiPad.pads[0].chordMatch
    await click('Chord Match pad 1')
    expect(s.state.multiPad.pads[0].chordMatch).toBe(!match)
    await click('At the ending')
    expect(s.state.multiPad.synchroStop).toEqual({ styleStop: true, ending: true })
    await click('Style stops')
    expect(s.state.multiPad.synchroStop).toEqual({ styleStop: false, ending: true })
    const slider = page().getByRole('slider', { name: 'Multi Pad volume' })
    await fireEvent.keyDown(slider, { key: 'Home' })
    flushSync()
    expect(s.state.mixer.multiPadVolume).toBe(0)
  })

  it('Shift+Z X C V play the pads and Shift+B stops them (the page names these keys)', () => {
    setup()
    const key = (k: string) => binding({ key: k, code: '', shiftKey: true, ctrlKey: false, altKey: false, metaKey: false })
    expect(key('Z')).toEqual({ cmd: { type: 'triggerMultiPad', pad: 0 } })
    expect(key('V')).toEqual({ cmd: { type: 'triggerMultiPad', pad: 3 } })
    expect(key('B')).toEqual({ cmd: { type: 'stopAllMultiPads' } })
    expect(page().getByText(/⇧B stops all/)).toBeTruthy()
  })
})
