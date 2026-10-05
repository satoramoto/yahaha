<!--
  Pad: one band pad (`--pad-size` square), in the state language. The caption at the bottom left
  and the pad's index top right in mono, both in the pad's hue, on a transparent face inside a 1px
  inset outline of that hue. Faces: idle (the outline), dark (the style lacks it: the outline and
  words in `--absent`), playing and running (a solid fill of the hue, the words in `--on-ink`),
  next and armed (waiting: a 2px ring and a faint fill of the hue, "NEXT" or "ARMED" in place of the
  index). Next and armed flash: the parent passes the phase in `lit`; unlit drops the fill and
  falls back to the 1px outline. Utility pads are neutral (`--neutral`, solid when on); Start / Stop
  goes solid `--ok` when running. Outlines are inset box-shadows, so the size never changes.
-->
<script lang="ts">
  import type { Action } from 'svelte/action'

  type Family = 'intro' | 'main' | 'ending' | 'brk' | 'fill' | 'util' | 'start'

  type Props = {
    /** The caption ("Main B", "Sync Start"). Tie a numeral to its word with a no-break space. */
    label: string
    /** The pad's number on the Launchkey, top right ("1" … "16"). Replaced by NEXT or ARMED. */
    index?: string
    /** The family: a section hue, `util` (neutral) or `start` (Start / Stop, `--ok` when running). */
    family?: Family
    /** The face. */
    state?: 'idle' | 'dark' | 'playing' | 'next' | 'armed' | 'running'
    /** The flash phase of `next` and `armed`: false drops the fill and draws the 1px outline. */
    lit?: boolean
    /** The accessible name. Default: "{label} (pad {index})". */
    name?: string
    /** The tooltip key, rendered as `data-tip`. */
    tip?: string
    /** The app's `use:tip` action, applied with `tip` when both are set. */
    tipAction?: Action<HTMLElement, string>
    /** Called on a click, Space or Enter. */
    onpress?: () => void
  }

  let {
    label,
    index = '',
    family = 'main',
    state = 'idle',
    lit = true,
    name,
    tip,
    tipAction,
    onpress,
  }: Props = $props()

  let util = $derived(family === 'util' || family === 'start')
  /** The hue token: `--absent` for a dark pad, else the family's, `--neutral` for utilities and
      `--ok` for a running Start / Stop. */
  let hue = $derived(
    state === 'dark' ? 'absent' : family === 'start' && state === 'running' ? 'ok' : util ? 'neutral' : family,
  )
  /** The glow token's hue: the neutral glow is the white one. */
  let glow = $derived(hue === 'neutral' ? 't' : hue)
  let corner = $derived(state === 'next' ? 'NEXT' : state === 'armed' ? 'ARMED' : index)
  let solid = $derived(state === 'playing' || state === 'running')
  let waiting = $derived(state === 'next' || state === 'armed')

  const tipped: Action<HTMLElement, string | undefined> = (node, key) => {
    if (!tipAction || key === undefined) return
    const handle = tipAction(node, key)
    return {
      update: (next) => {
        if (next !== undefined) handle?.update?.(next)
      },
      destroy: () => handle?.destroy?.(),
    }
  }
</script>

<button
  type="button"
  class="pad face-{state}"
  class:util
  class:solid
  class:waiting
  class:unlit={waiting && !lit}
  style:--hue="var(--{hue})"
  style:--glow="var(--pad-glow-{glow})"
  data-face={state}
  data-hue={hue}
  data-contrast={state === 'dark' ? 'dim' : undefined}
  data-tip={tip}
  aria-label={name ?? `${label}${index ? ` (pad ${index})` : ''}`}
  onclick={() => onpress?.()}
  use:tipped={tip}
>
  <span class="index" aria-hidden="true">{corner}</span>
  <span class="label">{label}</span>
</button>

<style>
  .pad {
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    align-items: flex-start;
    box-sizing: border-box;
    width: var(--pad-size);
    min-width: 0;
    height: var(--pad-size);
    margin: 0;
    padding: 0 var(--space-4) var(--space-12);
    border: none;
    border-radius: var(--radius);
    background: transparent;
    box-shadow: inset 0 0 0 var(--outline-width) var(--hue);
    color: var(--hue);
    font-family: var(--font-sans);
    text-align: left;
    cursor: pointer;
  }
  .label {
    position: relative;
    font: var(--type-small);
    letter-spacing: var(--tracking-small);
  }
  .index {
    position: absolute;
    top: var(--pad-index-top);
    right: var(--pad-index-right);
    font: var(--type-small);
    letter-spacing: var(--tracking-small);
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
  }

  .solid {
    background: var(--hue);
    box-shadow:
      inset 0 0 0 var(--outline-width) var(--hue),
      var(--glow);
    color: var(--on-ink);
  }

  /* Waiting: the 2px ring over a faint fill of the hue, drawn beneath the words. */
  .waiting {
    box-shadow: inset 0 0 0 var(--outline-width-wait) var(--hue);
  }
  .waiting::before {
    content: '';
    position: absolute;
    inset: 0;
    background: var(--hue);
    opacity: var(--wait-fill-opacity);
    pointer-events: none;
  }
  .waiting .label {
    color: var(--t);
  }
  .face-armed {
    box-shadow:
      inset 0 0 0 var(--outline-width-wait) var(--hue),
      var(--glow);
  }
  /* The flash's off phase: no fill, no glow, the rest outline; the words stay. */
  .waiting.unlit {
    box-shadow: inset 0 0 0 var(--outline-width) var(--hue);
  }
  .waiting.unlit::before {
    content: none;
  }

  .pad:focus-visible {
    outline: var(--line-width) solid var(--focus);
    outline-offset: var(--focus-offset);
  }
</style>
