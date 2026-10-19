<!--
  SoundPick: a keyboard part's quick sound list (SoundPick board), open while `ui.soundList` is set
  (the Stage's sound row sets it). A scrim dims the window (a press on it closes the list); the list
  sits 8px under `list.anchor`, left-aligned to it (above it when there's no room below), centred
  when there's no anchor. A row loads the sound on the part at once (`assignSound`) and the list
  stays open; "More in Library" opens Library › Sounds for the part and closes it. Esc
  (`ui.escape`) closes it.
-->
<script lang="ts">
  import { onMount, tick } from 'svelte'
  import type { Action } from 'svelte/action'
  import type { GmMapRow } from '../../lib/api/types'
  import { app, ui, PART_IDS, type SoundList } from '../../lib/store.svelte'
  import { tip } from '../../lib/tooltip/tip.svelte'
  import SoundPickList from '../../ui/SoundPickList/SoundPickList.svelte'
  import { playingId, quickGroups } from './model'

  let { list }: { list: SoundList } = $props()

  // The list's tip keys are the `sounds.quick_*` entries; the ui component takes any string.
  const tipAction = tip as unknown as Action<HTMLElement, string>
  const SHORT = ['R1', 'R2', 'R3', 'L'] as const
  const NAMES = ['Right 1', 'Right 2', 'Right 3', 'Left'] as const
  const HUES = ['r1', 'r2', 'r3', 'l'] as const
  const WIDTH = 380
  const GAP = 8
  const MARGIN = 16
  // One empty GM map, so an engine without one doesn't make a new array per state.
  const NO_ROWS: GmMapRow[] = []

  const part = $derived(Math.max(0, PART_IDS.indexOf(list.part)))
  const patches = $derived(app.state.soundLibrary.patches)
  const gmMap = $derived(app.state.soundLibrary.gmMap ?? NO_ROWS)
  const ctx = $derived.by(() => ({ patches, gmMap }))
  const kp = $derived(app.state.keyboardParts[part])
  const playing = $derived(kp ? playingId(kp, ctx) : null)
  let query = $state('')
  const groups = $derived(quickGroups(app.sounds, ctx, playing, query))

  // Where it sits: under the anchor, else above it, else centred (fixed, in window pixels).
  const place = $derived.by(() => {
    const a = list.anchor
    if (!a || typeof window === 'undefined') return null
    const vw = window.innerWidth
    const vh = window.innerHeight
    const left = Math.max(MARGIN, Math.min(a.left, vw - WIDTH - MARGIN))
    const below = vh - a.bottom - GAP - MARGIN
    const above = a.top - GAP - MARGIN
    if (below >= 320 || below >= above) return { left, top: a.bottom + GAP, bottom: null, max: below }
    return { left, top: null, bottom: vh - a.top + GAP, max: above }
  })

  let wrap: HTMLDivElement | undefined = $state()

  const close = () => (ui.soundList = null)
  const pick = (id: string) => app.send({ type: 'assignSound', part, id })
  function more() {
    ui.openLibrary('sounds', part)
    close()
  }

  onMount(() => {
    void tick().then(() => wrap?.querySelector<HTMLInputElement>('input')?.focus())
  })
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions (Esc closes it from the keyboard) -->
<div class="scrim" onclick={close}></div>
<div
  class="at"
  class:centred={!place}
  bind:this={wrap}
  style:left={place ? `${place.left}px` : null}
  style:top={place?.top != null ? `${place.top}px` : null}
  style:bottom={place?.bottom != null ? `${place.bottom}px` : null}
  style:max-height={place ? `${Math.max(200, place.max)}px` : null}
>
  <SoundPickList
    part={SHORT[part]}
    partName={NAMES[part]}
    hue={HUES[part]}
    {groups}
    {query}
    empty={query.trim() ? `No sound matches “${query.trim()}”.` : 'No sounds yet: no SoundFonts, plugins or saved sounds.'}
    rowTip="sounds.quick_row"
    searchTip="sounds.quick_search"
    moreTip="sounds.quick_more"
    closeTip="sounds.quick_close"
    {tipAction}
    oninput={(q) => (query = q)}
    onpick={pick}
    onmore={more}
    onclose={close}
  />
</div>

<style>
  .scrim {
    position: fixed;
    inset: 0;
    z-index: 100;
    background: var(--scrim);
  }
  .at {
    position: fixed;
    z-index: 101;
    display: flex;
    flex-direction: column;
    max-height: calc(100vh - 32px);
  }
  .at.centred {
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    max-height: min(640px, calc(100vh - 32px));
  }
</style>
