import { describe, expect, it, vi } from 'vitest'
import { MockSession } from '../../lib/api/mock'
import type { AppCmd, AppState, SoundCatalog } from '../../lib/api/types'
import { followPendingEditor, instrumentsActions, instrumentsProps, type InstrumentsDeps, type InstrumentsPageState } from './instrumentsModel'

async function fixture(setup?: (s: MockSession) => void): Promise<{ state: AppState; catalog: SoundCatalog }> {
  const session = new MockSession({ demo: true, manual: true })
  setup?.(session)
  let state: AppState | undefined
  session.subscribe((s) => (state = s))
  const catalog = await session.sounds()
  return { state: state!, catalog }
}

const pageState = (over: Partial<InstrumentsPageState> = {}): InstrumentsPageState => ({ show: 'all', chosen: null, pendingEditor: null, ...over })

function deps(state: AppState, catalog: SoundCatalog, st = pageState(), part = 0) {
  const sent: AppCmd[] = []
  const d = {
    state: () => state,
    catalog: () => catalog,
    send: (c: AppCmd) => sent.push(c),
    part: () => part,
    st,
    browseSounds: vi.fn(),
    showRacks: vi.fn(),
    replaceOnPart: vi.fn(),
    openEditor: vi.fn(),
  } satisfies InstrumentsDeps
  return { d, sent, actions: instrumentsActions(d) }
}

describe('instrumentsProps', () => {
  it('lists the plugins (new first), the missing one and the SoundFonts, with the header counts', async () => {
    const { state, catalog } = await fixture()
    const p = instrumentsProps(state, catalog, pageState(), 0)
    const plugins = state.plugins.list.length + state.plugins.missing.length
    expect(p.summary).toMatch(new RegExp(`^${plugins} plugins, \\d+ SoundFonts?$`))
    expect(p.rows[0]).toMatchObject({ name: 'Tiny Synth', kind: 'AU', fresh: true, status: 'not opened yet' })
    expect(p.rows.find((r) => r.name === 'String Deluxe')).toMatchObject({ id: 'missing:aumu Str1 Fake', status: 'Missing', missing: true, racks: '1' })
    expect(p.rows.find((r) => r.name === 'Broken Synth')).toMatchObject({ failed: true, status: 'failed: timed out after 20.0 s' })
    expect(p.rows.some((r) => r.kind === 'SF' && r.racks === '—')).toBe(true)
    // Missing String Deluxe and the failed Broken Synth.
    expect(p.attention).toBe(2)
    expect(p.canRescan).toBe(true)
    expect(p.folder).toBe(state.io.soundFonts.join(', '))
    // Nothing chosen: the first row's details.
    expect(p.selected).toBe(p.rows[0].id)
    expect(p.detail).toMatchObject({ title: 'Tiny Synth', badge: 'AU', inProcess: false, newSound: { part: state.keyboardParts[0].name }, edit: { enabled: false } })
  })

  it('filters by the Show tab and keeps the chosen row only while it is shown', async () => {
    const { state, catalog } = await fixture()
    const fonts = instrumentsProps(state, catalog, pageState({ show: 'fonts', chosen: 'au:aumu Smp7 Fake' }), 0)
    expect(fonts.rows.every((r) => r.kind === 'SF')).toBe(true)
    expect(fonts.detail?.badge).toBe('SoundFont')
    const att = instrumentsProps(state, catalog, pageState({ show: 'attention', chosen: 'missing:aumu Str1 Fake' }), 0)
    expect(att.rows.map((r) => r.name).sort()).toEqual(['Broken Synth', 'String Deluxe'])
    expect(att.detail).toMatchObject({ title: 'String Deluxe', showRacks: true, replace: { enabled: false }, canBrowse: false, newSound: null })
  })

  it('a missing plugin a part plays: that part in its hue, Replace… on', async () => {
    const { state, catalog } = await fixture((s) => s.missingPlugin(2))
    const p = instrumentsProps(state, catalog, pageState({ chosen: 'missing:aumu Str1 Fake' }), 0)
    expect(p.detail?.replace).toEqual({ enabled: true })
    expect(p.detail?.fields.find((f) => f.label === 'Silent on')?.values).toEqual([{ text: 'Right 3', hue: 'r3' }])
  })

  it('a plugin playing on a part: In use on that part, Edit… on', async () => {
    const { state, catalog } = await fixture()
    const parts = state.keyboardParts.map((k, i) =>
      i === 1 ? { ...k, plugin: { ...(k.plugin ?? {}), id: 'aumu Smp7 Fake', name: 'Sampler Deluxe', status: 'playing', editor: true, missing: false } } : k,
    ) as AppState['keyboardParts']
    const p = instrumentsProps({ ...state, keyboardParts: parts }, catalog, pageState({ chosen: 'au:aumu Smp7 Fake' }), 0)
    expect(p.rows.find((r) => r.name === 'Sampler Deluxe')?.status).toBe('In use on R2')
    expect(p.detail?.edit).toEqual({ enabled: true })
    expect(p.detail?.fields.find((f) => f.label === 'Playing on')?.values).toEqual([{ text: 'Right 2', hue: 'r2' }])
  })
})

describe('instrumentsActions', () => {
  it('choosing a New plugin marks it seen; the Show tab is app state', async () => {
    const { state, catalog } = await fixture()
    const { d, sent, actions } = deps(state, catalog)
    actions.onchoose('au:aumu Tiny Demo')
    expect(d.st.chosen).toBe('au:aumu Tiny Demo')
    expect(sent).toEqual([{ type: 'markPluginSeen', id: 'aumu Tiny Demo' }])
    actions.onchoose('au:aumu Smp7 Fake')
    expect(sent).toHaveLength(1)
    actions.onshow('plugins')
    expect(d.st.show).toBe('plugins')
  })

  it('Rescan, In process and + New sound send their commands', async () => {
    const { state, catalog } = await fixture()
    const { d, sent, actions } = deps(state, catalog, pageState(), 3)
    actions.onrescan()
    actions.oninprocess('au:aumu Smp7 Fake', true)
    actions.onnewsound('au:aumu Smp7 Fake')
    expect(sent).toEqual([
      { type: 'rescanPlugins' },
      { type: 'setPluginInProcess', id: 'aumu Smp7 Fake', inProcess: true },
      { type: 'setPartPlugin', part: 3, id: 'aumu Smp7 Fake', state: null },
    ])
    expect(d.st.pendingEditor).toBe('aumu Smp7 Fake')
    const scanning = deps({ ...state, plugins: { ...state.plugins, scanning: true } }, catalog)
    scanning.actions.onrescan()
    expect(scanning.sent).toEqual([])
  })

  it('Browse sounds hands the Sounds page its instrument id; Show racks and Replace… navigate', async () => {
    const { state, catalog } = await fixture((s) => s.missingPlugin(1))
    const { d, sent, actions } = deps(state, catalog)
    actions.onbrowse('font:GeneralUser-GS.sf2')
    expect(d.browseSounds).toHaveBeenLastCalledWith('sf:GeneralUser-GS.sf2')
    actions.onbrowse('au:aumu Tiny Demo')
    expect(d.browseSounds).toHaveBeenLastCalledWith('au:aumu Tiny Demo')
    expect(sent).toEqual([{ type: 'markPluginSeen', id: 'aumu Tiny Demo' }])
    actions.onshowracks('missing:aumu Str1 Fake')
    expect(d.showRacks).toHaveBeenCalled()
    actions.onreplace('missing:aumu Str1 Fake')
    expect(d.replaceOnPart).toHaveBeenCalledWith(1)
  })

  it('Edit… opens the window of a part playing the plugin, the target part first', async () => {
    const { state, catalog } = await fixture()
    const playing = { id: 'aumu Smp7 Fake', name: 'Sampler Deluxe', status: 'playing', editor: true, missing: false }
    const parts = state.keyboardParts.map((k, i) => (i === 1 || i === 2 ? { ...k, plugin: { ...(k.plugin ?? {}), ...playing } } : k)) as AppState['keyboardParts']
    const s = { ...state, keyboardParts: parts }
    const a = deps(s, catalog, pageState(), 2)
    a.actions.onedit('au:aumu Smp7 Fake')
    expect(a.d.openEditor).toHaveBeenCalledWith(2)
    const b = deps(s, catalog, pageState(), 0)
    b.actions.onedit('au:aumu Smp7 Fake')
    expect(b.d.openEditor).toHaveBeenCalledWith(1)
  })
})

describe('followPendingEditor', () => {
  it('opens the window once the part plays the pending plugin, then forgets it', async () => {
    const { state } = await fixture()
    const at = (status: string, editor = true) =>
      ({ ...state, keyboardParts: state.keyboardParts.map((k, i) => (i === 0 ? { ...k, plugin: { ...(k.plugin ?? {}), id: 'aumu Smp7 Fake', status, editor } } : k)) }) as AppState
    const st = pageState({ pendingEditor: 'aumu Smp7 Fake' })
    const open = vi.fn()
    followPendingEditor(at('loading'), 0, st, open)
    expect(open).not.toHaveBeenCalled()
    expect(st.pendingEditor).toBe('aumu Smp7 Fake')
    followPendingEditor(at('playing'), 0, st, open)
    expect(open).toHaveBeenCalledWith(0)
    expect(st.pendingEditor).toBeNull()
    const failed = pageState({ pendingEditor: 'aumu Smp7 Fake' })
    followPendingEditor(at('failed'), 0, failed, open)
    expect(failed.pendingEditor).toBeNull()
  })
})
