// Retired: the rack prompts (`liveRack.prompt`) are asked as dialogs over every page by
// panels/prompts/PromptHost, so nothing opens the Rack drawer for them any more. Kept as a
// no-op only while StageScreen and SettingsScreen still call it; delete this file with those
// two calls.

export function openRackDrawerOnPrompt() {}
