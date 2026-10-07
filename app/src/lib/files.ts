// The system file picker, for files outside the library (a `.pad` bank anywhere on disk).
// In the app shell it is Tauri's dialog plugin (`tauri-plugin-dialog`, allowed to open only:
// app/src-tauri/capabilities/default.json). In a plain browser, Storybook and tests there is no
// file system to pick from, so it answers as if you cancelled.

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
