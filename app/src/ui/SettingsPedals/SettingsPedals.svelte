<!--
  SettingsPedals: the Pedals page of the Settings screen, below the page header the Screen draws.
  The pedals table: per pedal its name (lit while held), the CC it listens for, its function, the
  Control type (switch functions only), Reverse, the Range (Pitch Bend only), Try and Learn. Under
  it, which controllers reach each keyboard part (lamps in the part's hue) and each part's bend
  range, with the help beside them. Controlled: every edit is reported through onchange as a
  PedalsChange and nothing changes until `data` does (a picker that was moved goes back to what
  `data` says). One text size; square; the state language's faces.
-->
<script lang="ts">
  import type { Action } from 'svelte/action'
  import Button from '../Button/Button.svelte'
  import LampButton from '../LampButton/LampButton.svelte'
  import type { PedalFunction, PedalRow, PedalsChange, PedalsPageData } from '../Settings/types'

  type Props = {
    /** The three pedals, the functions they can run (grouped for the picker), and the four parts. */
    data: PedalsPageData
    /** The app's `use:tip` action, passed in by the wiring; applied to every control with its tooltip key. */
    tipAction?: Action<HTMLElement, string>
    /** Called with each change asked for; the page itself changes nothing. */
    onchange?: (change: PedalsChange) => void
  }

  let { data, tipAction, onchange }: Props = $props()

  const CONTROL_TYPES: { id: PedalRow['controlType']; label: string }[] = [
    { id: 'holdA', label: 'Hold A' },
    { id: 'holdB', label: 'Hold B' },
    { id: 'toggle', label: 'Toggle' },
  ]
  const RANGES: { id: PedalRow['range']; label: string }[] = [
    { id: 'upper', label: 'Upper' },
    { id: 'lower', label: 'Lower' },
    { id: 'full', label: 'Full' },
  ]
  const CONTROLLERS: { id: 'sustain' | 'pitchBend' | 'modulation'; label: string; tip: string }[] = [
    { id: 'sustain', label: 'Sustain', tip: 'pedal.part_sustain' },
    { id: 'pitchBend', label: 'Pitch bend', tip: 'pedal.part_bend' },
    { id: 'modulation', label: 'Modulation', tip: 'pedal.part_modulation' },
  ]
  const BEND_MAX = 12

  /** Each function by id, for a pedal's name and kind. */
  let byId = $derived(new Map<string, PedalFunction>(data.functions.flatMap((g) => g.items.map((f) => [f.id, f]))))

  /** Applies the parent's tooltip action with the key. */
  const tipped: Action<HTMLElement, string> = (node, key) => {
    if (!tipAction) return
    const handle = tipAction(node, key)
    return { update: (next) => handle?.update?.(next), destroy: () => handle?.destroy?.() }
  }

  /** The CC text each input last committed, so Enter then blur reports once. Cleared on focus. */
  const committed: (string | undefined)[] = []

  function commitCc(pedal: number, input: HTMLInputElement) {
    const text = input.value.trim()
    if (committed[pedal] === text) return
    committed[pedal] = text
    const current = data.pedals[pedal]?.cc ?? null
    const cc = text === '' ? null : /^\d{1,3}$/.test(text) && Number(text) <= 127 ? Number(text) : undefined
    // Back to what data says, until data moves it; a value that isn't a CC is dropped.
    input.value = current === null ? '' : String(current)
    if (cc === undefined) committed[pedal] = undefined
    else if (cc !== current) onchange?.({ type: 'cc', pedal, cc })
  }

  /** Reports a picker's choice, then puts the picker back to `data` until data moves it. */
  function picked(select: HTMLSelectElement, value: string, report: (value: string) => void) {
    const chosen = select.value
    select.value = value
    report(chosen)
  }
</script>

<div class="page">
  <div class="table pedals" role="table" aria-label="Pedals">
    <div class="row head" role="row">
      <span role="columnheader">Pedal</span>
      <span role="columnheader">CC</span>
      <span role="columnheader">Function</span>
      <span role="columnheader">Control type <span class="qual">switch kinds</span></span>
      <span role="columnheader">Reverse</span>
      <span role="columnheader">Range <span class="qual">Pitch Bend</span></span>
      <span role="columnheader"><span class="sr">Try and Learn</span></span>
    </div>
    {#each data.pedals as pedal, i (i)}
      {@const n = i + 1}
      {@const fn = byId.get(pedal.fn)}
      <div class="row" role="row">
        <span class="cell name" class:down={pedal.down} data-down={pedal.down ? '' : undefined} role="cell"
          >P{n}{#if pedal.down}<span class="sr">, held</span>{/if}</span
        >
        <span class="cell" role="cell">
          <input
            class="field cc"
            type="text"
            inputmode="numeric"
            maxlength="3"
            autocomplete="off"
            value={pedal.cc === null ? '' : String(pedal.cc)}
            aria-label="Pedal {n} CC"
            data-tip="pedal.cc"
            use:tipped={'pedal.cc'}
            onfocus={() => (committed[i] = undefined)}
            onchange={(e) => commitCc(i, e.currentTarget)}
            onblur={(e) => commitCc(i, e.currentTarget)}
            onkeydown={(e) => {
              if (e.key === 'Enter') commitCc(i, e.currentTarget)
            }}
          />
        </span>
        <span class="cell" role="cell">
          <span class="picker">
            <select
              class="field"
              value={pedal.fn}
              aria-label="Pedal {n} function"
              data-tip="pedal.function"
              use:tipped={'pedal.function'}
              onchange={(e) =>
                picked(e.currentTarget, pedal.fn, (fn) => onchange?.({ type: 'function', pedal: i, fn }))}
            >
              {#if !fn}<option value={pedal.fn}>{pedal.fn}</option>{/if}
              {#each data.functions as g (g.group)}
                <optgroup label={g.group}>
                  {#each g.items as f (f.id)}<option value={f.id}>{f.label}</option>{/each}
                </optgroup>
              {/each}
            </select>
            <span class="caret" aria-hidden="true">▾</span>
          </span>
        </span>
        <span class="cell" role="cell">
          {#if fn?.switchKind}
            <span class="picker">
              <select
                class="field"
                value={pedal.controlType}
                aria-label="Pedal {n} control type"
                data-tip="pedal.control_type"
                use:tipped={'pedal.control_type'}
                onchange={(e) =>
                  picked(e.currentTarget, pedal.controlType, (value) =>
                    onchange?.({ type: 'controlType', pedal: i, value: value as PedalRow['controlType'] }),
                  )}
              >
                {#each CONTROL_TYPES as t (t.id)}<option value={t.id}>{t.label}</option>{/each}
              </select>
              <span class="caret" aria-hidden="true">▾</span>
            </span>
          {:else}
            <span class="none" aria-hidden="true">—</span><span class="sr">Not used by {fn?.label ?? pedal.fn}</span>
          {/if}
        </span>
        <span class="cell" role="cell">
          <LampButton
            label={pedal.reverse ? 'On' : 'Off'}
            on={pedal.reverse}
            size="sm"
            width={64}
            name="Pedal {n} reverse"
            tip="pedal.reverse"
            {tipAction}
            ontoggle={(on) => onchange?.({ type: 'reverse', pedal: i, on })}
          />
        </span>
        <span class="cell" role="cell">
          {#if fn?.bend}
            <span class="picker">
              <select
                class="field"
                value={pedal.range}
                aria-label="Pedal {n} range"
                data-tip="pedal.range"
                use:tipped={'pedal.range'}
                onchange={(e) =>
                  picked(e.currentTarget, pedal.range, (value) =>
                    onchange?.({ type: 'range', pedal: i, value: value as PedalRow['range'] }),
                  )}
              >
                {#each RANGES as r (r.id)}<option value={r.id}>{r.label}</option>{/each}
              </select>
              <span class="caret" aria-hidden="true">▾</span>
            </span>
          {:else}
            <span class="none" aria-hidden="true">—</span><span class="sr">Only for Pitch Bend</span>
          {/if}
        </span>
        <span class="cell actions" role="cell">
          <Button
            label="Try"
            name="Try pedal {n}"
            tip="pedal.try"
            disabled={fn?.bend ?? false}
            {tipAction}
            onpress={() => onchange?.({ type: 'try', pedal: i })}
          />
          <Button
            label={pedal.learning ? 'Learning…' : 'Learn'}
            name={pedal.learning ? `Learning pedal ${n}: press to stop` : `Learn pedal ${n}`}
            waiting={pedal.learning}
            pressed={pedal.learning}
            tip="pedal.learn"
            {tipAction}
            onpress={() => onchange?.({ type: 'learn', pedal: i })}
          />
        </span>
      </div>
    {/each}
  </div>

  <p class="help">
    <span class="lead">Control type</span> (Hold A, Hold B, Toggle) is for switch functions;
    <span class="lead">Range</span> (Upper, Lower, Full) is for Pitch Bend.
  </p>

  <div class="lower">
    <div class="table reach" role="table" aria-label="Which controllers reach each part">
      <div class="row head" role="row">
        <span role="columnheader">Reaches</span>
        {#each data.parts as part (part.name)}
          <span role="columnheader" class="part" data-hue={part.hue} style:color={`var(--${part.hue})`}
            >{part.name}</span
          >
        {/each}
      </div>
      {#each CONTROLLERS as c (c.id)}
        <div class="row" role="row">
          <span role="rowheader" class="rowname">{c.label}</span>
          {#each data.parts as part, p (part.name)}
            <span class="cell" role="cell">
              <LampButton
                label={part[c.id] ? 'On' : 'Off'}
                on={part[c.id]}
                hue={part.hue}
                size="sm"
                width={64}
                name="{c.label} reaches {part.name}"
                tip={c.tip}
                {tipAction}
                ontoggle={(on) => onchange?.({ type: 'reach', part: p, controller: c.id, on })}
              />
            </span>
          {/each}
        </div>
      {/each}
      <div class="row" role="row">
        <span role="rowheader" class="rowname">Bend range</span>
        {#each data.parts as part, p (part.name)}
          <span class="cell bend" role="cell">
            <Button
              symbol="minus"
              size="icon"
              hue={part.hue}
              name="{part.name} bend range down"
              tip="pedal.bend_down"
              disabled={part.bendRange <= 0}
              {tipAction}
              onpress={() => onchange?.({ type: 'bendStep', part: p, delta: -1 })}
            />
            <span class="value">{part.bendRange}</span>
            <Button
              symbol="plus"
              size="icon"
              hue={part.hue}
              name="{part.name} bend range up"
              tip="pedal.bend_up"
              disabled={part.bendRange >= BEND_MAX}
              {tipAction}
              onpress={() => onchange?.({ type: 'bendStep', part: p, delta: 1 })}
            />
          </span>
        {/each}
      </div>
    </div>

    <div class="notes">
      <p class="help"><span class="lead">Learn:</span> press it, then move the pedal. yahaha takes the CC it sends.</p>
      <p class="help"><span class="lead">Try:</span> runs the function once, as a pedal press, without the pedal.</p>
      <p class="help">
        <span class="lead">Reaches:</span> which of your four parts hear each controller. The style never does.
      </p>
      <p class="help"><span class="lead">Bend range</span> is in semitones, per part.</p>
    </div>
  </div>
</div>

<style>
  /* Sizes the scale lacks: the page area and the two tables' columns. */
  .page {
    --pedals-page-width: 1048px;
    --pedals-name-col: 40px;
    --pedals-cc-col: 64px;
    --pedals-function-col: 280px;
    --pedals-select-col: 120px;
    --pedals-lamp-col: 64px;
    --reach-name-col: 104px;
    --reach-part-col: 112px;
    --bend-value-width: 24px;

    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: var(--space-16);
    width: var(--pedals-page-width);
    max-width: 100%;
    color: var(--value-ink);
    font: var(--type-text);
    letter-spacing: var(--tracking-text);
    font-variant-numeric: tabular-nums;
  }

  .table {
    display: flex;
    flex-direction: column;
    gap: var(--space-8);
  }
  .row {
    display: grid;
    align-items: center;
    column-gap: var(--space-16);
  }
  .pedals .row {
    grid-template-columns:
      var(--pedals-name-col) var(--pedals-cc-col) var(--pedals-function-col) var(--pedals-select-col)
      var(--pedals-lamp-col) var(--pedals-select-col) auto;
  }
  .reach .row {
    grid-template-columns: var(--reach-name-col) repeat(4, var(--reach-part-col));
    column-gap: var(--space-12);
  }
  .head {
    padding-bottom: var(--space-6);
    border-bottom: var(--line-width) solid var(--line);
    white-space: nowrap;
  }
  .qual {
    color: var(--caption-ink);
  }
  .cell {
    display: flex;
    align-items: center;
    min-width: 0;
  }

  /* The pedal's name, lit (a solid neutral block, --on-ink) while it is held. */
  .name {
    justify-content: center;
    height: var(--control-height-compact);
  }
  .name.down {
    background: var(--neutral);
    color: var(--on-ink);
  }

  /* The CC field and the pickers: square, a 1px neutral outline and the value in the neutral hue. */
  .field {
    box-sizing: border-box;
    width: 100%;
    height: var(--control-height-compact);
    margin: 0;
    padding: 0 var(--space-8);
    border: 0;
    border-radius: var(--radius);
    background: var(--g);
    box-shadow: inset 0 0 0 var(--outline-width) var(--neutral);
    color: var(--neutral);
    font: var(--type-text);
    letter-spacing: var(--tracking-text);
    font-variant-numeric: tabular-nums;
  }
  .field:focus-visible,
  .cc:focus {
    outline: var(--line-width) solid var(--focus);
    outline-offset: var(--focus-offset);
  }
  .cc {
    text-align: center;
  }
  .picker {
    position: relative;
    display: flex;
    width: 100%;
  }
  select.field {
    appearance: none;
    padding-right: var(--space-24);
    cursor: pointer;
  }
  select.field option,
  select.field optgroup {
    background: var(--g);
    color: var(--value-ink);
  }
  .caret {
    position: absolute;
    top: 50%;
    right: var(--space-8);
    transform: translateY(-50%);
    color: var(--neutral);
    font-size: var(--glyph-sm);
    pointer-events: none;
  }
  .none {
    color: var(--caption-ink);
  }
  .actions {
    gap: var(--space-8);
  }

  .help {
    margin: 0;
    color: var(--caption-ink);
  }
  .lead {
    color: var(--value-ink);
  }

  .lower {
    display: flex;
    gap: var(--space-24);
    align-items: flex-start;
  }
  .rowname {
    white-space: nowrap;
  }
  .bend {
    gap: var(--space-6);
  }
  .value {
    width: var(--bend-value-width);
    text-align: center;
  }
  .notes {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: var(--space-8);
    min-width: 0;
    padding-top: var(--space-6);
  }

  .sr {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
</style>
