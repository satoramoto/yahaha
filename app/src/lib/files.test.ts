import { afterEach, describe, expect, it, vi } from 'vitest'
import { pickFailure, pickFile, type FilePick } from './files'

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

  it('in the app shell rejects when the dialog fails', async () => {
    ;(window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {}
    open.mockRejectedValueOnce(new Error('dialog.open not allowed'))
    await expect(pickFile(PICK)).rejects.toThrow('dialog.open not allowed')
  })
})

describe('pickFailure', () => {
  it("says the picker didn't open, with the reason when there is one", () => {
    expect(pickFailure(new Error('dialog.open not allowed'))).toBe("The file picker didn't open: dialog.open not allowed")
    expect(pickFailure('denied')).toBe("The file picker didn't open: denied")
    expect(pickFailure(undefined)).toBe("The file picker didn't open.")
    expect(pickFailure(new Error(''))).toBe("The file picker didn't open.")
  })
})
