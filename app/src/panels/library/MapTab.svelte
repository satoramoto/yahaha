<!--
  Library › Style map (StyleMap board, docs/racks.md "Deviations from the wireframe"): the
  program map that makes every style play your sounds, in the Push skin. The header row: the
  scope the rule commands edit (Global / This style, with the style's own rule count), "Port
  sends mapped" (a lamp) and Clear style map. Under it three columns: the families (drums + the
  16 GM families, a filled dot where a rule is set) with the library file line, the chosen
  family's programs, and Add from SoundFont.

  State: soundLibrary (map, styleMap, styleKey, portSendsMapped, families, patches). Commands:
  setPortSendsMapped, clearStyleMap (the columns send the rest).
-->
<script lang="ts">
  import type { Action } from 'svelte/action'
  import { app } from '../../lib/store.svelte'
  import { tip } from '../../lib/tooltip/tip.svelte'
  import Button from '../../ui/Button/Button.svelte'
  import ChosenTabs from '../../ui/ChosenTabs/ChosenTabs.svelte'
  import LampButton from '../../ui/LampButton/LampButton.svelte'
  import FamilyList from '../../ui/StyleMap/FamilyList.svelte'
  import type { FamilyItem } from '../../ui/StyleMap/types'
  import AddPage from '../sound/AddPage.svelte'
  import GmMapPage from '../sound/GmMapPage.svelte'
  import LibraryFile from '../sound/LibraryFile.svelte'
  import { familyRange, nav } from '../sound/nav.svelte'

  const tipAction = tip as unknown as Action<HTMLElement, string>
  const sl = $derived(app.state.soundLibrary)
  const map = $derived(nav.styleScope ? sl.styleMap : sl.map)
  const styleRules = $derived(sl.styleMap.families.filter(Boolean).length + sl.styleMap.overrides.length + (sl.styleMap.drums ? 1 : 0))

  /** A rule's sound as the list names it: "41 Silk Strings". */
  function ruleLabel(id: string | null): string | null {
    if (!id) return null
    const p = sl.patches.find((x) => x.id === id)
    return p ? `${p.number} ${p.name}` : id
  }

  const families = $derived<FamilyItem[]>([
    { id: -1, range: familyRange(-1), name: 'Drums', rule: ruleLabel(map.drums) },
    ...sl.families.map((name, f) => ({ id: f, range: familyRange(f), name, rule: ruleLabel(map.families[f] ?? null) })),
  ])

  const scopeTabs = $derived([
    { id: 'global', label: 'Global', tip: 'sound.scope' },
    {
      id: 'style',
      label: `This style${sl.styleKey ? `: ${sl.styleKey}` : ''}${styleRules ? ` · ${styleRules}` : ''}`,
      name: `This style${sl.styleKey ? `: ${sl.styleKey}` : ''}, ${styleRules} rule${styleRules === 1 ? '' : 's'} of its own`,
      tip: 'sound.scope',
    },
  ])
</script>

<div class="map">
  <div class="bar">
    <span class="title">Style map</span>
    <ChosenTabs tabs={scopeTabs} chosen={nav.styleScope ? 'style' : 'global'} size="compact" label="Map scope" {tipAction} onchoose={(id) => (nav.styleScope = id === 'style')} />
    <span class="push"></span>
    <LampButton label="Port sends mapped" hue="lamp" size="sm" on={sl.portSendsMapped} tip="sound.port_mapped" {tipAction} ontoggle={(on) => app.send({ type: 'setPortSendsMapped', on })} />
    <Button
      label="Clear style map"
      hue="ending"
      disabled={styleRules === 0}
      name="Clear style map: removes this style's {styleRules} rule{styleRules === 1 ? '' : 's'}"
      tip="sound.clear_style_map"
      {tipAction}
      onpress={() => app.send({ type: 'clearStyleMap' })}
    />
  </div>

  <div class="cols">
    <div class="left">
      <FamilyList {families} chosen={nav.family} tip="sound.map_family" {tipAction} onchoose={(id) => (nav.family = id)} />
      <LibraryFile />
    </div>
    <GmMapPage />
    <AddPage />
  </div>
</div>

<style>
  .map {
    display: flex;
    flex-direction: column;
    gap: var(--space-12);
    height: 100%;
    min-height: 0;
    color: var(--t);
    font-family: var(--font-sans);
  }
  .bar {
    display: flex;
    flex: none;
    align-items: center;
    gap: var(--space-12);
    box-sizing: border-box;
    height: 36px;
    border-bottom: var(--line-width) solid var(--line);
    white-space: nowrap;
  }
  .title {
    color: var(--m);
    font-size: 14px;
  }
  .push {
    flex: 1;
  }
  .cols {
    display: flex;
    flex: 1 1 0;
    gap: var(--space-24);
    min-height: 0;
  }
  .left {
    display: flex;
    flex: none;
    flex-direction: column;
    gap: var(--space-16);
    width: 220px;
    min-height: 0;
  }
  .left > :global(nav) {
    flex: 1 1 0;
  }
</style>
