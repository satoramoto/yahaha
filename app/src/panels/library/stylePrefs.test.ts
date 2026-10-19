import { describe, expect, it } from 'vitest'
import { BrowserPrefs, type PrefsStorage } from './stylePrefs.svelte'

describe('prefs', () => {
  it('persist through the storage and survive junk', () => {
    let saved: string | null = null
    const store: PrefsStorage = { load: () => (saved ? JSON.parse(saved) : null), save: (s) => (saved = JSON.stringify(s)) }
    const a = new BrowserPrefs(store)
    a.toggleFavourite('/x.sty')
    a.noteLoaded('/a.sty')
    a.noteLoaded('/b.sty')
    a.noteLoaded('/a.sty')
    a.setAutoPreview(true)
    a.setCategory({ kind: 'folder', path: 'Pop' })
    const b = new BrowserPrefs(store)
    expect([...b.favourites]).toEqual(['/x.sty'])
    expect(b.recents).toEqual(['/a.sty', '/b.sty'])
    expect(b.autoPreview).toBe(true)
    expect(b.category).toEqual({ kind: 'folder', path: 'Pop' })
    const junk = new BrowserPrefs({ load: () => ({ favourites: 'no', category: { kind: 'nope' } }) as never, save: () => {} })
    expect(junk.favourites.size).toBe(0)
    expect(junk.category).toEqual({ kind: 'all' })
  })
})
