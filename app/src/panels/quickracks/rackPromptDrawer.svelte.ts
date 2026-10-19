// The rack prompts (`liveRack.prompt`: unsaved changes, sound names) are asked in one
// place, the Rack panel, until the dialogs lane asks them in panels/prompts/PromptHost.
// Whatever shows the Quick Racks (the stage's Quick Racks row, Settings) calls this while
// it's mounted: a prompt that appears opens the Rack page so it's visible, and App goes
// back to the page it came from once the prompt is answered (`ui.promptReturn`). Only on
// its appearance, so leaving the Rack page sticks.

import { untrack } from 'svelte'
import { app, ui } from '../../lib/store.svelte'

export function openRackDrawerOnPrompt() {
  let asked = false
  $effect(() => {
    const now = app.state.liveRack.prompt !== null
    if (now && !asked && ui.view !== 'library' && !ui.rack) untrack(() => ui.openRackForPrompt())
    asked = now
  })
}
