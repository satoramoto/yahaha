<!--
  The Style map's middle column (StyleMap board, docs/sound-browser.md O5): the chosen family's
  programs (or the drum kit). The heading carries the family's rule: its sound (opens the sound
  picker) and "Set to auto" (clears it), then the family level as a bar readout. Each program
  row: number, GM name, From (the layer that decided it), what it plays (opens the sound picker
  for the program's override; ✕ clears an override) and the level the deciding rule sets.
  Choosing a row picks the program "Add and map" maps to.

  The rule controls edit the global map, or the current style's own (nav.styleScope: unset
  rules fall through to the global one, ↳). "Plays" is what plays now for the style playing.

  State: soundLibrary (gmMap, map, styleMap, usage, families, patches). Commands: setDrumRule,
  setFamilyRule, setProgramOverride.
-->
<script lang="ts">
  import type { Action } from 'svelte/action'
  import { GM } from '../../lib/api/constants'
  import type { GmMapRow, ProgramMap } from '../../lib/api/types'
  import { app } from '../../lib/store.svelte'
  import { tip } from '../../lib/tooltip/tip.svelte'
  import LevelBar from '../../ui/StyleMap/LevelBar.svelte'
  import ProgramTable from '../../ui/StyleMap/ProgramTable.svelte'
  import type { ProgramItem } from '../../ui/StyleMap/types'
  import PatchSelect from './PatchSelect.svelte'
  import { chosenProgram, familyRange, nav, patchName, soundName } from './nav.svelte'

  const tipAction = tip as unknown as Action<HTMLElement, string>
  const sl = $derived(app.state.soundLibrary)
  const style = $derived(nav.styleScope)
  const map = $derived(style ? sl.styleMap : sl.map)
  const f = $derived(nav.family)
  const drums = $derived(f < 0)
  const name = $derived(drums ? 'Drums' : (sl.families[f] ?? ''))

  /** The style's parts on each program (or the drums), in one pass. */
  const parts = $derived.by(() => {
    const at: Record<string, string[]> = {}
    for (const u of sl.usage) {
      const k = u.drums ? 'drums' : String(u.gmProgram)
      const list = (at[k] ??= [])
      if (!list.includes(u.part)) list.push(u.part)
    }
    return at
  })

  const rows = $derived(sl.gmMap.filter((r) => (drums ? r.program === null : r.family === f)))
  const chosen = $derived(chosenProgram(sl.gmMap, f, nav.program))

  /** The map whose rule decided a row: the style's own, or the global one. */
  const deciding = (r: GmMapRow): ProgramMap => (r.resolved.fromStyle ? sl.styleMap : sl.map)

  function level(r: GmMapRow): number | null {
    const m = deciding(r)
    switch (r.resolved.layer) {
      case 'override':
        return m.overrides.find((o) => o.program === r.program)?.volume ?? null
      case 'family':
        return r.family === null ? null : (m.familyVolumes?.[r.family] ?? null)
      case 'drums':
        return m.drumsVolume ?? null
      default:
        return null
    }
  }

  function plays(r: GmMapRow): { num: number | null; name: string } {
    const id = r.resolved.sound
    if (id?.startsWith('saved:')) {
      const p = sl.patches.find((x) => x.id === id.slice(6))
      if (p) return { num: p.number, name: p.name }
    }
    return { num: null, name: soundName(sl, app.sounds.entries, id, r.resolved.font) }
  }

  const items = $derived(
    rows.map((r): ProgramItem => {
      const sound = plays(r)
      const key = r.program === null ? 'drums' : String(r.program)
      return {
        program: r.program ?? -1,
        num: r.program === null ? 'Kit' : String(r.program + 1),
        name: r.program === null ? 'Drum kit' : GM[r.program],
        from: r.resolved.layer,
        fromStyle: r.resolved.fromStyle,
        soundNum: sound.num,
        sound: sound.name,
        level: level(r),
        used: parts[key]?.join(', '),
      }
    }),
  )

  const rule = $derived(drums ? map.drums : (map.families[f] ?? null))
  const globalRule = $derived(drums ? sl.map.drums : (sl.map.families[f] ?? null))
  const ruleLevel = $derived(drums ? (map.drumsVolume ?? null) : (map.familyVolumes?.[f] ?? null))
  /** What an unset rule says: in the style's map, the global rule it falls through to. */
  const none = $derived(style && globalRule ? `↳ ${patchName(sl, globalRule)}` : 'Auto')

  function setRule(patch: string | null) {
    if (drums) app.send({ type: 'setDrumRule', patch, style })
    else app.send({ type: 'setFamilyRule', family: f, patch, style })
  }
  const override = (p: number) => map.overrides.find((o) => o.program === p)?.patch ?? null
  const globalOverride = (p: number) => sl.map.overrides.find((o) => o.program === p)?.patch ?? null
</script>

{#snippet playsCell(p: ProgramItem)}
  {#if p.program < 0}
    {#if p.soundNum !== null}<span class="snum">{p.soundNum}</span>{/if}<span class="sound">{p.sound}</span>
  {:else}
    <PatchSelect
      cell
      value={override(p.program)}
      shown={{ num: p.soundNum, name: p.sound }}
      label="Override for {GM[p.program]}"
      tipKey="sound.override_patch"
      none={style && globalOverride(p.program) ? `↳ ${patchName(sl, globalOverride(p.program))}` : 'no override'}
      onpick={(patch) => app.send({ type: 'setProgramOverride', program: p.program, patch, style })}
    />
  {/if}
{/snippet}

<section class="programs" aria-label="{name}, {drums ? 'the drum kit' : `programs ${f * 8 + 1} to ${f * 8 + 8}`}">
  <div class="head">
    <span class="title">{name}</span>
    <span class="range">{familyRange(f)}</span>
    <span class="caption">Rule</span>
    <PatchSelect
      value={rule}
      label={drums ? 'Drum rule' : `${name} family rule`}
      tipKey={drums ? 'sound.drums' : 'sound.family'}
      {none}
      clearText="Set to auto"
      onpick={setRule}
    />
  </div>
  <LevelBar label={drums ? 'Drum level' : 'Family level'} name="{name} {drums ? 'drum' : 'family'} level" value={rule ? ruleLevel : null} />
  <ProgramTable
    programs={items}
    {chosen}
    label={drums ? 'The drum kit' : `Programs ${f * 8 + 1} to ${f * 8 + 8}`}
    tip="sound.map_program"
    {tipAction}
    plays={playsCell}
    onchoose={(p) => (nav.program = p < 0 ? null : p)}
  />
</section>

<style>
  .programs {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: var(--space-4);
    min-width: 0;
    min-height: 0;
  }
  .head {
    display: flex;
    align-items: center;
    gap: var(--space-10);
    height: var(--control-height);
    white-space: nowrap;
  }
  .title {
    color: var(--t);
    font-size: 18px;
    line-height: 24px;
  }
  .range,
  .snum {
    color: var(--m);
    font-family: var(--font-mono);
    font-size: 11px;
  }
  .caption {
    margin-left: auto;
    color: var(--m);
    font: var(--type-text);
    font-size: 12px;
  }
  .sound {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>
