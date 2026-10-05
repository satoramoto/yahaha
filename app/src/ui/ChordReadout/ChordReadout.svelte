<!--
  ChordReadout: the display's chord, the brightest thing on the screen. A "Chord" label, the
  128px light chord in the accent with its extension after it, the row of notes each with its
  interval beneath, and the fingering mode's word. Held (detection unsure, the band keeps the
  last chord): the chord dims to muted grey without its glow, with a small "held" beside it.
  A readout, not a control.
-->
<script lang="ts">
  type Note = {
    /** The note's name ("A", "C", "F♯"). */
    note: string
    /** Its interval from the root ("R", "m3", "5", "m7"). */
    interval: string
  }

  type Props = {
    /** The chord before its extension ("Am", "C", "F♯m"). Empty: "—". */
    chord: string
    /** The extension, drawn after the chord ("7", "maj7", "sus4"). */
    extension?: string
    /** The chord's notes, root first. */
    notes?: Note[]
    /** The fingering mode's word ("Fingered", "Single Finger", "AI Full Keyboard"). */
    fingering?: string
    /** Detection is unsure and the last chord is held: muted, no glow, "held" beside it. */
    held?: boolean
    /** The label over the chord. */
    label?: string
  }

  let { chord, extension = '', notes = [], fingering = '', held = false, label = 'Chord' }: Props = $props()

  const shown = $derived(chord.trim() === '' ? '—' : chord)
  /** The chord's size: 128px for up to three characters (Am7), smaller for longer names so they fit the column. */
  const length = $derived([...(shown + extension)].length)
  const fit = $derived(length <= 3 ? 'full' : length === 4 ? '4' : length === 5 ? '5' : length <= 7 ? '6' : '8')
  const spoken = $derived(
    `${label}: ${chord.trim() === '' ? 'none' : chord + extension}${held ? ', held' : ''}` +
      (notes.length ? `. Notes ${notes.map((n) => n.note).join(' ')}` : '') +
      (fingering ? `. ${fingering}` : ''),
  )
</script>

<div class="readout" class:held role="group" aria-label={spoken} data-held={held ? 'true' : 'false'}>
  <span class="label" aria-hidden="true">{label}</span>
  <div class="chord" data-fit={fit} aria-hidden="true">
    {shown}<span class="ext">{extension}</span>{#if held}<span class="held-word">held</span>{/if}
  </div>
  <div class="notes" aria-hidden="true">
    {#each notes as n, i (i)}
      <span class="note"><span class="name">{n.note}</span><span class="interval">{n.interval}</span></span>
    {/each}
    {#if fingering}<span class="fingering">{fingering}</span>{/if}
  </div>
</div>

<style>
  .readout {
    display: flex;
    flex-direction: column;
    min-width: 0;
    font-family: var(--font-sans);
    font-variant-numeric: tabular-nums;
  }
  .label {
    height: var(--label-height);
    font: var(--type-body);
    letter-spacing: var(--tracking-body);
    line-height: var(--label-height);
    color: var(--caption-ink);
  }
  .chord {
    margin-top: var(--space-4);
    height: var(--hero-height);
    font: var(--type-hero);
    letter-spacing: var(--tracking-hero);
    font-variant-numeric: tabular-nums;
    color: var(--chord);
    text-shadow: var(--chord-glow);
    white-space: nowrap;
  }
  .chord[data-fit='4'] {
    font-size: var(--hero-4);
    letter-spacing: var(--tracking-hero-4);
  }
  .chord[data-fit='5'] {
    font-size: var(--hero-5);
    letter-spacing: var(--tracking-hero-5);
  }
  .chord[data-fit='6'] {
    font-size: var(--hero-6);
    letter-spacing: var(--tracking-hero-6);
  }
  .chord[data-fit='8'] {
    font-size: var(--hero-8);
    letter-spacing: var(--tracking-hero-8);
  }
  .held .chord {
    color: var(--chord-held);
    text-shadow: none;
  }
  .held-word {
    margin-left: var(--space-8);
    font: var(--type-body);
    letter-spacing: var(--tracking-body);
    color: var(--caption-ink);
    text-shadow: none;
  }
  .notes {
    margin-top: var(--space-6);
    height: var(--note-row-height);
    display: flex;
    align-items: flex-end;
    gap: var(--space-16);
  }
  .note {
    width: var(--note-width);
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  /* The name and its interval share the 32px note row: 16px each. */
  .name {
    font: var(--type-readout);
    letter-spacing: var(--tracking-readout);
    line-height: var(--label-height);
    color: var(--t);
  }
  .interval {
    font: var(--type-small);
    letter-spacing: var(--tracking-small);
    font-variant-numeric: tabular-nums;
    color: var(--caption-ink);
  }
  .fingering {
    margin-left: var(--space-4);
    font: var(--type-body);
    letter-spacing: var(--tracking-body);
    line-height: var(--label-height);
    color: var(--caption-ink);
    white-space: nowrap;
  }
</style>
