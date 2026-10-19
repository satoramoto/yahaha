// The system file chooser that is up, if any: app-only state, so PromptHost can show the
// waiting card (Prompts-More board G) while the chooser is open. Pass `pickFileWaiting` as a
// page's `pick` where Open file… should show the card.

import { pickFile, type FilePick } from '../../lib/files'

class FileWait {
  /** What the open chooser was asked for; null: none open. */
  pick = $state<FilePick | null>(null)
}

export const fileWait = new FileWait()

/** `pickFile`, with the waiting card up while the chooser is open. */
export async function pickFileWaiting(pick: FilePick): Promise<string | null> {
  fileWait.pick = pick
  try {
    return await pickFile(pick)
  } finally {
    fileWait.pick = null
  }
}
