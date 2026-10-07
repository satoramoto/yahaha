// The system file picker, for files outside the library (a `.pad` bank, a style file or a Chord
// Looper bank anywhere on disk). In the app shell it is Tauri's dialog plugin
// (`tauri-plugin-dialog`, allowed to open only: app/src-tauri/capabilities/default.json). In a
// plain browser, Storybook and tests there is no file system to pick from, so it answers as if you
// cancelled. When the dialog itself fails, `pickFile` rejects: its callers catch that and say so
// (`pickFailure`).

/** What to pick: the dialog's title and the file types it shows. */
export type FilePick = {
  title: string
  /** The filter's name ("Multi Pad banks") and its extensions without the dot (["pad"]). */
  filter: { name: string; extensions: string[] }
}

function inTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

/** Opens the system file picker for one file. Resolves to its path, or null when cancelled. */
export async function pickFile(pick: FilePick): Promise<string | null> {
  if (!inTauri()) return null
  const { open } = await import('@tauri-apps/plugin-dialog')
  const path = await open({ title: pick.title, multiple: false, directory: false, filters: [pick.filter] })
  return typeof path === 'string' ? path : null
}

/** What to show when the file picker failed (`pickFile` rejected with `error`). */
export function pickFailure(error: unknown): string {
  const why = (error instanceof Error ? error.message : typeof error === 'string' ? error : '').trim()
  return why ? `The file picker didn't open: ${why}` : "The file picker didn't open."
}
