<!--
  The Style map's right column, Add from SoundFont (StyleMap board): the presets of a SoundFont
  in the SoundFont folder (read from its preset headers), searchable; audition one (the band
  stopped), add it to My Sounds (+), or choose one and "Add and map" it to the chosen program
  (or the drum kit). Mapping a SoundFont preset's catalog id adds it to My Sounds and names it
  in the rule, in one command.

  State: io.soundFonts, soundLibrary.browse, soundLibrary.auditioning, transport.running.
  Commands: browseSoundFont, auditionPreset, stopPatchAudition, addPresetAsPatch,
  setProgramOverride, setDrumRule.
-->
<script lang="ts">
  import type { Action } from 'svelte/action'
  import { GM } from '../../lib/api/constants'
  import { app } from '../../lib/store.svelte'
  import { tip } from '../../lib/tooltip/tip.svelte'
  import SearchField from '../../ui/SearchField/SearchField.svelte'
  import { chosenProgram, nav } from './nav.svelte'

  const tipAction = tip as unknown as Action<HTMLElement, string>
  const sl = $derived(app.state.soundLibrary)
  const fonts = $derived(app.state.io.soundFonts)
  const browse = $derived(sl.browse)
  const running = $derived(app.state.transport.running)
  let query = $state('')
  let playing = $state<string | null>(null)

  const shown = $derived.by(() => {
    const q = query.trim().toLowerCase()
    const all = browse?.presets ?? []
    return (q ? all.filter((p) => p.name.toLowerCase().includes(q)) : all).slice(0, 300)
  })
  const inLibrary = (bank: number, program: number) =>
    sl.patches.some((p) => p.source.kind === 'soundFont' && p.source.file === browse?.file && p.source.bank === bank && p.source.program === program)
  const key = (bank: number, program: number) => `${bank}:${program}`
  const bp = (bank: number, program: number) => (bank >= 128 ? `kit:${String(program + 1).padStart(3, '0')}` : `${String(bank).padStart(3, '0')}:${String(program + 1).padStart(3, '0')}`)

  const chosen = $derived(browse ? (browse.presets.find((p) => key(p.bank, p.program) === nav.preset) ?? null) : null)
  const target = $derived(chosenProgram(sl.gmMap, nav.family, nav.program))
  const targetName = $derived(target < 0 ? 'the drum kit' : `${target + 1} ${GM[target]}`)

  function audition(bank: number, program: number) {
    if (!browse || running) return
    if (sl.auditioning === 'preset' && playing === key(bank, program)) {
      app.send({ type: 'stopPatchAudition' })
      return
    }
    playing = key(bank, program)
    app.send({ type: 'auditionPreset', file: browse.file, bank, program })
  }

  function addAndMap() {
    if (!browse || !chosen) return
    const patch = `sf:${browse.file}:${chosen.bank}:${chosen.program}`
    if (target < 0) app.send({ type: 'setDrumRule', patch, style: nav.styleScope })
    else app.send({ type: 'setProgramOverride', program: target, patch, style: nav.styleScope })
  }
</script>

<section class="add" aria-label="Add from SoundFont">
  <span class="caption">Add from SoundFont</span>
  <label class="font">
    <span class="sf" aria-hidden="true">SF2</span>
    <select aria-label="SoundFont" value={browse?.file ?? ''} use:tip={'sound.soundfont'} onchange={(e) => app.send({ type: 'browseSoundFont', file: e.currentTarget.value || null })}>
      <option value="">Choose a SoundFont…</option>
      {#each fonts as f (f)}<option value={f}>{f.replace(/\.sf2$/i, '')}</option>{/each}
    </select>
  </label>
  <SearchField value={query} label="Find a preset" placeholder="Find a preset" tip="sound.preset_search" {tipAction}oninput={(v) => (query = v)} />

  {#if fonts.length === 0}
    <p class="explain">No SoundFonts: put .sf2 files in the synth's SoundFont folder (soundfonts/).</p>
  {:else if !browse}
    <p class="explain">Pick a SoundFont to list its presets.</p>
  {:else if browse.error}
    <p class="explain err">{browse.file}: {browse.error}</p>
  {:else}
    <div class="presets" role="list" aria-label={query ? `Presets matching ${query}` : 'Presets'}>
      {#each shown as p (key(p.bank, p.program))}
        {@const k = key(p.bank, p.program)}
        {@const on = nav.preset === k}
        {@const playingThis = sl.auditioning === 'preset' && playing === k}
        <div class="preset" class:on role="listitem">
          <button type="button" class="choose" aria-current={on ? 'true' : undefined} aria-label="{p.name || '(no name)'}{inLibrary(p.bank, p.program) ? ', in My Sounds' : ''}" use:tip={'sound.preset_pick'} onclick={() => (nav.preset = k)}>
            <span class="bp">{bp(p.bank, p.program)}</span>
            <span class="pn">{p.name || '(no name)'}{#if inLibrary(p.bank, p.program)}<small> · in My Sounds</small>{/if}</span>
          </button>
          <button
            type="button"
            class="aud"
            aria-label={running ? `Audition ${p.name} (stop the band first)` : `${playingThis ? 'Stop' : 'Audition'} ${p.name}`}
            aria-disabled={running}
            use:tip={playingThis ? 'sound.audition_stop' : 'sound.preset'}
            onclick={() => audition(p.bank, p.program)}>{playingThis ? '■' : '▶'}</button
          >
          <button type="button" class="plus" aria-label="Add {p.name} to My Sounds" use:tip={'sound.preset_add'} onclick={() => browse && app.send({ type: 'addPresetAsPatch', file: browse.file, bank: p.bank, program: p.program, name: null })}>+</button>
        </div>
      {/each}
    </div>
    <p class="explain">
      {#if chosen}Saves {chosen.name} to My Sounds, then plays it for {targetName}.{:else}{browse.presets.length} presets{shown.length < browse.presets.length ? `, ${shown.length} shown` : ''}. Choose one to map it.{/if}
    </p>
  {/if}
  <button type="button" class="map" disabled={!chosen} use:tip={'sound.add_map'} onclick={addAndMap}>Add and map to {target < 0 ? 'Kit' : target + 1}</button>
</section>

<style>
  .add {
    display: flex;
    flex: none;
    flex-direction: column;
    gap: var(--space-8);
    width: 260px;
    min-height: 0;
  }
  .caption {
    height: 16px;
    color: var(--m);
    font: var(--type-text);
    font-size: 12px;
    line-height: 16px;
  }
  .font {
    display: flex;
    align-items: center;
    gap: var(--space-8);
    box-sizing: border-box;
    height: var(--control-height);
    padding: 0 var(--space-10);
    border-radius: 4px;
    background: var(--btn);
  }
  .sf {
    color: var(--m);
    font-size: 11px;
  }
  select {
    flex: 1;
    min-width: 0;
    height: 100%;
    border: 0;
    background: none;
    color: var(--t2);
    font: var(--type-text);
    font-size: 14px;
    outline: none;
  }
  select option {
    background: var(--g);
    color: var(--t);
  }
  .explain {
    margin: 0;
    color: var(--m);
    font: var(--type-text);
    font-size: 12px;
  }
  .err {
    color: var(--ending);
  }
  .presets {
    display: flex;
    flex: 1 1 0;
    flex-direction: column;
    min-height: 64px;
    overflow-y: auto;
    border-top: var(--line-width) solid var(--line);
  }
  .preset {
    display: flex;
    flex: none;
    align-items: center;
    gap: var(--space-6);
    box-sizing: border-box;
    height: var(--control-height);
    padding-left: var(--space-8);
    border-bottom: var(--line-width) solid var(--line);
    color: var(--t);
  }
  .preset.on {
    border-bottom-color: var(--t);
    background: var(--t);
    color: var(--g);
  }
  .choose {
    display: flex;
    flex: 1;
    align-items: center;
    gap: var(--space-6);
    min-width: 0;
    height: 100%;
    margin: 0;
    padding: 0;
    border: 0;
    background: none;
    color: inherit;
    font: var(--type-text);
    font-size: 14px;
    text-align: left;
    cursor: pointer;
  }
  .bp {
    flex: none;
    width: 52px;
    color: var(--m);
    font-family: var(--font-mono);
    font-size: 11px;
  }
  .pn {
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .pn small {
    color: var(--m);
    font-size: 11px;
  }
  .on .bp,
  .on .pn small {
    color: color-mix(in srgb, var(--g) 55%, transparent);
  }
  .aud,
  .plus {
    flex: none;
    width: 28px;
    height: 28px;
    margin: 0;
    padding: 0;
    border: 0;
    border-radius: 4px;
    cursor: pointer;
  }
  .aud {
    background: none;
    color: var(--t2);
    font-size: 11px;
  }
  .aud[aria-disabled='true'] {
    color: var(--d);
    cursor: default;
  }
  .on .aud[aria-disabled='true'] {
    color: color-mix(in srgb, var(--g) 55%, transparent);
  }
  .plus {
    background: var(--btn);
    color: var(--t2);
    font-size: 15px;
    font-weight: var(--weight-light);
  }
  .map {
    flex: none;
    height: 44px;
    margin-top: auto;
    padding: 0 var(--space-16);
    border: 0;
    border-radius: 4px;
    background: var(--t);
    color: var(--g);
    font: var(--type-strong);
    font-size: 14px;
    cursor: pointer;
  }
  .map:disabled {
    background: var(--btn);
    color: var(--d);
    cursor: default;
  }
</style>
