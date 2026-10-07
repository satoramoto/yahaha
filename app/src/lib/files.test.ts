import { afterEach, describe, expect, it, vi } from 'vitest'
import { pickFile, type FilePick } from './files'

const open = vi.hoisted(() => vi.fn())
vi.mock('@tauri-apps/plugin-dialog', () => ({ open }))

const PICK: FilePick = { title: 'Load a Multi Pad bank', filter: { name: 'Multi Pad banks', extensions: ['pad'] } }

afterEach(() => {
  delete (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__
  open.mockReset()
})

describe('pickFile', () => {
  it('outside the app shell answers as a cancel, without opening a dialog', async () => {
    expect(await pickFile(PICK)).toBeNull()
    expect(open).not.toHaveBeenCalled()
  })

  it('in the app shell opens one file, filtered to the extensions, and returns its path', async () => {
    ;(window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {}
    open.mockResolvedValueOnce('/Users/me/Funk.pad')
    expect(await pickFile(PICK)).toBe('/Users/me/Funk.pad')
    expect(open).toHaveBeenCalledWith({ title: PICK.title, multiple: false, directory: false, filters: [PICK.filter] })
  })

  it('in the app shell returns null when the dialog is cancelled', async () => {
    ;(window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {}
    open.mockResolvedValueOnce(null)
    expect(await pickFile(PICK)).toBeNull()
  })
})
