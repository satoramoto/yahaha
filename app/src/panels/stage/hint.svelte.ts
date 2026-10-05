// The status line's tooltip (model.ts `statusHint`), fed from the stores. Call it while a
// component initialises (it sets up an effect): it remembers the message `seq` whenever the
// shown control changes, so an error that arrives during a hover still shows.

import { untrack } from 'svelte'
import type { TipKey } from '../../help/tooltips'
import { app } from '../../lib/store.svelte'
import { tips } from '../../lib/tooltip/tip.svelte'
import type { StatusHint } from '../../ui/StatusLine/StatusLine.svelte'
import { statusHint } from './model'

export function useStatusHint(): { readonly current: StatusHint | null } {
  let since = $state(untrack(() => app.state.message?.seq ?? 0))
  let last: TipKey | null = untrack(() => tips.shown)
  $effect.pre(() => {
    const shown = tips.shown
    if (shown === last) return
    last = shown
    since = untrack(() => app.state.message?.seq ?? 0)
  })
  const current = $derived(statusHint({ key: tips.shown, help: tips.help, message: app.state.message, since }))
  return {
    get current() {
      return current
    },
  }
}
