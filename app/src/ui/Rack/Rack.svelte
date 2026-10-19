<!--
  Rack: the "Change a sound" page in the Push skin (docs/design/push/Rack-Dark.dc.html,
  docs/specs/push/Rack.md). A tall page, 1392 × 468: the left column (the compact now-playing
  block and the rack's keyboard settings), a hairline, then the page: the head (the rack's name,
  Mine, Modified, Revert, Save as…, Save), the parts table (your hands: the four keyboard parts'
  sound and mix as readouts in the part's hue, dim while off), and three groups under it: the
  Controller map, the Send effects and One Touch.

  "Edit map" opens the controller map editor in the parts table's place (the `editor` snippet,
  RackMapEditor); the group then reads Edited, Default map and Done. Save as… swaps the head's
  buttons for a name field. Every control is a callback; the page holds only the open name field.
-->
<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { Action } from 'svelte/action'
  import Button from '../Button/Button.svelte'
  import ChosenTabs from '../ChosenTabs/ChosenTabs.svelte'
  import LampButton from '../LampButton/LampButton.svelte'
  import HueValue from './HueValue.svelte'
  import type { RackHand, RackHead, RackKeyboard, RackMapSummary, RackNow, RackOneTouch, RackSend } from './types'

  type Props = {
    now: RackNow
    keyboard: RackKeyboard
    head: RackHead
    hands: RackHand[]
    map: RackMapSummary
    /** The controller map editor shows in the parts table's place. */
    mapOpen?: boolean
    /** The controller map editor (RackMapEditor), rendered while `mapOpen`. */
    editor?: Snippet
    sends: RackSend[]
    /** Another send can be added (fewer than six). */
    canAddSend?: boolean
    oneTouch: RackOneTouch
    tipAction?: Action<HTMLElement, string>
    // Keyboard settings
    onsplit?: (delta: number) => void
    ontranspose?: (delta: number) => void
    onharmony?: (on: boolean) => void
    /** The Harmony type's name: opens Harm/Arp. */
    onharmonytype?: () => void
    onmanualbass?: () => void
    onlefthold?: () => void
    onstore?: () => void
    // Head
    onrevert?: () => void
    onsave?: () => void
    onsaveas?: (name: string) => void
    // Parts
    onsound?: (part: number) => void
    /** The On lamp: `on` is the state asked for. */
    onpart?: (part: number, on: boolean) => void
    onpartlong?: (part: number) => void
    onpartrelease?: (part: number) => void
    onlevel?: (part: number, value: number) => void
    onpan?: (part: number, value: number) => void
    /** Send 0-2 (reverb, chorus, delay). */
    onsend?: (part: number, send: number, value: number) => void
    onoctave?: (part: number, octave: number) => void
    /** Sends 4-6 or the insert: opens the part's Channel. */
    onchannel?: (part: number) => void
    onedit?: (part: number) => void
    onreload?: (part: number) => void
    onsavesound?: (part: number) => void
    oninprocess?: (part: number) => void
    onreplace?: (part: number) => void
    // Groups
    onmap?: (open: boolean) => void
    ondefaultmap?: () => void
    onaddsend?: () => void
    onremovesend?: (send: number) => void
    onkeeptype?: (send: number, on: boolean) => void
    onots?: (index: number) => void
    onlink?: (on: boolean) => void
    ontiming?: (timing: 'immediate' | 'mainChange') => void
    /** One Touch › Change: choose which rack each OTS loads. */
    onchangeots?: () => void
  }

  let p: Props = $props()

  const PART_IDS = ['right1', 'right2', 'right3', 'left']
  const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0')
  const panText = (v: number) => (v === 64 ? 'C' : v < 64 ? `L${64 - v}` : `R${v - 64}`)

  /** Save as…'s name while its field is open; null when closed. */
  let saveAs = $state<string | null>(null)

  function tipped(node: HTMLElement, key: string | undefined) {
    if (!p.tipAction || !key) return
    return p.tipAction(node, key)
  }

  function submitSaveAs(e: SubmitEvent) {
    e.preventDefault()
    const name = saveAs?.trim()
    if (!name) return
    p.onsaveas?.(name)
    saveAs = null
  }
  function focusName(el: HTMLInputElement) {
    el.focus({ preventScroll: true })
    el.select()
  }
  function nameKey(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      saveAs = null
    }
  }
</script>

<section class="rack" aria-label="Rack page: {p.head.name}">
  <!-- LEFT COLUMN (320): the compact block, then the rack's keyboard settings -->
  <div class="left">
    <div class="now" aria-label="Now playing">
      <div class="now-top">
        <span class="style">{p.now.style}</span>
        <span class="bpm">{p.now.bpm}<span class="unit">BPM</span></span>
        <span class="run" class:on={p.now.running} role="img" aria-label={p.now.running ? 'Running' : 'Stopped'}></span>
      </div>
      <div class="now-main">
        <span class="chord">{p.now.chord || '—'}{#if p.now.extension}<span class="ext">{p.now.extension}</span>{/if}</span>
        <span class="notes">{p.now.notes}</span>
        <span class="section" data-hue={p.now.hue}>{p.now.section}</span>
      </div>
    </div>

    <div class="settings" role="group" aria-label="Keyboard settings in this rack">
      <div class="srow head-row">
        <span class="caption">Keyboard</span>
        <span class="caption end">in this rack</span>
      </div>
      <div class="srow">
        <span class="word grow">Split</span>
        <span class="num">{p.keyboard.split}</span>
        <Button symbol="minus" size="icon" name="Split point down" tip="split.down" tipAction={p.tipAction} onpress={() => p.onsplit?.(-1)} />
        <Button symbol="plus" size="icon" name="Split point up" tip="split.up" tipAction={p.tipAction} onpress={() => p.onsplit?.(1)} />
      </div>
      <div class="srow">
        <span class="word grow">Transpose</span>
        <span class="num">{signed(p.keyboard.transpose)}</span>
        <Button symbol="minus" size="icon" name="Transpose down a semitone" tip="transpose.keyboard_down" tipAction={p.tipAction} onpress={() => p.ontranspose?.(-1)} />
        <Button symbol="plus" size="icon" name="Transpose up a semitone" tip="transpose.keyboard_up" tipAction={p.tipAction} onpress={() => p.ontranspose?.(1)} />
      </div>
      <div class="srow">
        <LampButton
          label="Harmony/Arp"
          size="sm"
          on={p.keyboard.harmonyOn}
          name="Harmony/Arpeggio in this rack: {p.keyboard.harmonyOn ? 'on' : 'off'} (fader button 5)"
          tip="harmony.switch"
          tipAction={p.tipAction}
          ontoggle={(on) => p.onharmony?.(on)}
        />
        <button type="button" class="link end" aria-label="Harmony type: {p.keyboard.harmonyType}. Opens Harm/Arp" data-tip="rack.harmony_type" use:tipped={'rack.harmony_type'} onclick={() => p.onharmonytype?.()}>{p.keyboard.harmonyType}</button>
      </div>
      <div class="srow">
        <LampButton
          label="Manual Bass"
          size="sm"
          on={p.keyboard.manualBass}
          disabled={!p.keyboard.manualBassEnabled}
          name={p.keyboard.manualBassEnabled ? `Manual Bass: ${p.keyboard.manualBass ? 'on' : 'off'}` : 'Manual Bass: works only with Upper chord detection'}
          tip="detection.manual_bass"
          tipAction={p.tipAction}
          ontoggle={() => p.onmanualbass?.()}
        />
        <span class="caption end">{p.keyboard.manualBassEnabled ? 'Left plays the bass' : 'Upper only'}</span>
      </div>
      <div class="srow">
        <LampButton
          label="Left Hold"
          size="sm"
          on={p.keyboard.leftHold}
          name="Left Hold: {p.keyboard.leftHold ? 'on' : 'off'} (fader button 7)"
          tip="detection.left_hold"
          tipAction={p.tipAction}
          ontoggle={() => p.onlefthold?.()}
        />
        <span class="caption end">Fader button 7</span>
      </div>
      <div class="srow">
        <span class="word grow">Quick Rack</span>
        <span class="num">{p.keyboard.quickRack || '—'}</span>
        <LampButton
          label="Store"
          size="sm"
          on={p.keyboard.store}
          name="Store this rack to a Quick Rack: arms Store, then tap a slot"
          tip="quick.store"
          tipAction={p.tipAction}
          ontoggle={() => p.onstore?.()}
        />
      </div>
    </div>
  </div>

  <div class="rule" aria-hidden="true"></div>

  <!-- PAGE (1023 × 468) -->
  <div class="page">
    <div class="phead">
      <span class="caption big">Rack</span>
      <span class="rname">{p.head.name}</span>
      {#if p.head.mine}<span class="mine">Mine</span>{/if}
      {#if p.head.modified}<span class="modified"><span class="dot" aria-hidden="true"></span>Modified</span>{/if}
      {#if saveAs === null}
        <span class="hint">{p.head.modified ? 'Changes play now and autosave here until you save.' : ''}</span>
        {#if p.head.canRevert}
          <button type="button" class="link push" data-tip="rack.revert" use:tipped={'rack.revert'} onclick={() => p.onrevert?.()}>Revert</button>
        {/if}
        <span class:push={!p.head.canRevert}>
          <Button label="Save as…" tip="rack.save_as" tipAction={p.tipAction} onpress={() => (saveAs = p.head.saveAsName)} />
        </span>
        <Button label="Save" chosen={p.head.canSave} disabled={!p.head.canSave} tip="rack.save" tipAction={p.tipAction} onpress={() => p.onsave?.()} />
      {:else}
        <form class="saveas" onsubmit={submitSaveAs}>
          <input
            class="name"
            aria-label="Rack name"
            placeholder="e.g. Sunday Gospel"
            bind:value={saveAs}
            data-tip="rack.save_as_name"
            use:tipped={'rack.save_as_name'}
            use:focusName
            onkeydown={nameKey}
          />
          <Button label="Cancel" tip="rack.cancel_save" tipAction={p.tipAction} onpress={() => (saveAs = null)} />
          <button type="submit" class="commit" disabled={!saveAs.trim()} data-tip="rack.save_as_commit" use:tipped={'rack.save_as_commit'}>Save</button>
        </form>
      {/if}
    </div>

    {#if p.mapOpen && p.editor}
      <div class="editor">{@render p.editor()}</div>
    {:else}
      <div class="hands" role="table" aria-label="Your hands: the four keyboard parts">
        <div class="hrow cols" role="row">
          <span role="columnheader"></span><span role="columnheader">Sound</span><span role="columnheader">On</span><span role="columnheader">Level</span><span role="columnheader">Pan</span><span role="columnheader">Reverb</span><span role="columnheader">Chorus</span><span role="columnheader">Delay</span><span role="columnheader">Sends 4–6</span><span role="columnheader">Octave</span><span role="columnheader">Insert</span><span role="columnheader">Plugin</span>
        </div>
        {#each p.hands as h, i (h.tag)}
          {@const dim = !h.on}
          <div class="hrow" role="row">
            <span class="tag" role="cell" data-hue={dim ? 'd' : h.hue}>{h.tag}</span>
            <span role="cell" class="cell">
              <button
                type="button"
                class="sound"
                aria-label="{h.name} sound: {h.number} {h.sound}{h.edited ? ', edited' : ''}{h.missing ? ', plugin missing' : ''}. Opens the quick sound list"
                data-tip="rack.sound"
                use:tipped={'rack.sound'}
                onclick={() => p.onsound?.(i)}
              >
                <span class="sline">
                  {#if h.number}<span class="snum">{h.number}</span>{/if}
                  <span class="sname" class:off={dim}>{h.sound}</span>
                  {#if h.edited}<span class="dot" title="Sound edited" aria-hidden="true"></span>{/if}
                  {#if h.missing}<span class="warn" aria-hidden="true">⚠</span>{/if}
                </span>
                <span class="inst">{h.instrument}</span>
              </button>
            </span>
            <span role="cell" class="cell">
              <LampButton
                label={h.on ? h.onWord : 'Off'}
                size="sm"
                width={48}
                hue={h.hue}
                on={h.on}
                name="{h.name} {h.on ? 'on' : 'off'}. Long press: swap mode, the knobs edit this part"
                tip="part.{PART_IDS[i]}.on"
                tipAction={p.tipAction}
                ontoggle={(on) => p.onpart?.(i, on)}
                onlongpress={() => p.onpartlong?.(i)}
                onlongrelease={() => p.onpartrelease?.(i)}
              />
            </span>
            <span role="cell" class="cell"><HueValue value={h.level} hue={h.hue} {dim} defaultValue={100} name="{h.name} level" tip="mixer.channel.level" tipAction={p.tipAction} onchange={(v) => p.onlevel?.(i, v)} /></span>
            <span role="cell" class="cell"><HueValue value={h.pan} hue={h.hue} {dim} defaultValue={64} display={panText(h.pan)} name="{h.name} pan" tip="mixer.part.pan" tipAction={p.tipAction} onchange={(v) => p.onpan?.(i, v)} /></span>
            <span role="cell" class="cell"><HueValue value={h.reverb} hue={h.hue} {dim} name="{h.name} reverb send" tip="mixer.part.reverb" tipAction={p.tipAction} onchange={(v) => p.onsend?.(i, 0, v)} /></span>
            <span role="cell" class="cell"><HueValue value={h.chorus} hue={h.hue} {dim} name="{h.name} chorus send" tip="mixer.part.chorus" tipAction={p.tipAction} onchange={(v) => p.onsend?.(i, 1, v)} /></span>
            <span role="cell" class="cell"><HueValue value={h.delay} hue={h.hue} {dim} name="{h.name} delay send" tip="mixer.part.variation" tipAction={p.tipAction} onchange={(v) => p.onsend?.(i, 2, v)} /></span>
            <span role="cell" class="cell">
              <button type="button" class="val small" data-hue={dim ? 'd' : h.hue} aria-label={h.sendsAria} data-tip="rack.sends" use:tipped={'rack.sends'} onclick={() => p.onchannel?.(i)}>{h.sends}</button>
            </span>
            <span role="cell" class="cell"><HueValue value={h.octave} min={-2} max={2} defaultValue={0} display={signed(h.octave)} hue={h.hue} {dim} name="{h.name} octave" tip="rack.octave" tipAction={p.tipAction} onchange={(v) => p.onoctave?.(i, v)} /></span>
            <span role="cell" class="cell">
              <button
                type="button"
                class="ins"
                aria-label="{h.name} insert 1: {h.insert}{h.insertAmount ? `, amount ${h.insertAmount}` : ''}. Opens the part's Channel"
                data-tip="rack.insert"
                use:tipped={'rack.insert'}
                onclick={() => p.onchannel?.(i)}
              >
                <span class="iname" class:none={h.insert === 'None' || dim}>{h.insert}</span>
                {#if h.insertAmount}<span class="val small" data-hue={dim ? 'd' : h.hue}>{h.insertAmount}</span>{/if}
              </button>
            </span>
            <span role="cell" class="cell plugin">
              {#if h.plugin === 'plugin'}
                <Button label="Edit" disabled={!h.canEdit} name="Open the {h.pluginName} editor for {h.name}" tip="rack.edit" tipAction={p.tipAction} onpress={() => p.onedit?.(i)} />
                {#if h.edited}
                  <Button label="Save sound" name="Save the edited sound on {h.name} to My Sounds" tip="rack.save_sound" tipAction={p.tipAction} onpress={() => p.onsavesound?.(i)} />
                {:else}
                  <Button label="Reload" name="Reload the plugin on {h.name}" tip="part.plugin_reload" tipAction={p.tipAction} onpress={() => p.onreload?.(i)} />
                {/if}
                <LampButton
                  label="In process"
                  size="sm"
                  on={h.inProcess}
                  disabled={!h.canInProcess}
                  name="{h.name} plugin runs in process: {h.inProcess ? 'on' : 'off'}"
                  tip="part.plugin_in_process"
                  tipAction={p.tipAction}
                  ontoggle={() => p.oninprocess?.(i)}
                />
              {:else if h.plugin === 'missing'}
                <Button label="Replace…" name="Replace the missing plugin on {h.name} with another sound; the mix is kept" tip="rack.replace" tipAction={p.tipAction} onpress={() => p.onreplace?.(i)} />
                <span class="caption">silent until replaced</span>
              {/if}
            </span>
          </div>
        {/each}
      </div>
    {/if}

    <!-- controller map · send effects · One Touch -->
    <div class="groups">
      <div class="group" role="group" aria-label="Controller map">
        <div class="ghead">
          <span class="caption big">Controller map</span>
          <span class="caption end" class:edited={p.map.edited}>{p.map.edited ? 'Edited' : 'Default'}</span>
        </div>
        <div class="grow-row">
          <span class="gname">Faders 1–4</span>
          <span class="gtext">{p.map.faders}</span>
        </div>
        <div class="grow-row">
          <span class="gname">Knobs 1–8</span>
          <span class="gtext">{p.map.knobs}</span>
        </div>
        <div class="grow-row">
          {#if p.mapOpen}
            <button
              type="button"
              class="link"
              aria-label="Put the default map back: the parts' levels on faders 1 to 4 and knobs 1 to 4, then Harmony volume, Metronome volume, nothing and Tempo"
              data-tip="rack.map_default"
              use:tipped={'rack.map_default'}
              onclick={() => p.ondefaultmap?.()}>Default map</button
            >
            <span class="push">
              <Button label="Done" pressed={true} name="Edit map: the editor is open above. Click to close it" tip="rack.map_done" tipAction={p.tipAction} onpress={() => p.onmap?.(false)} />
            </span>
          {:else}
            <span class="gtext muted grow">Drives faders 1–4 and knob page 2</span>
            <Button label="Edit map" pressed={false} tip="rack.map" tipAction={p.tipAction} onpress={() => p.onmap?.(true)} />
          {/if}
        </div>
      </div>

      <div class="group" role="group" aria-label="Send effects in this rack">
        <div class="ghead">
          <span class="caption big">Send effects</span>
          {#if p.canAddSend}
            <button type="button" class="link end strong" data-tip="fx.send_add" use:tipped={'fx.send_add'} onclick={() => p.onaddsend?.()}>+ Add send</button>
          {/if}
        </div>
        <div class="sends">
          {#each p.sends as s (s.send)}
            <div class="send">
              <span class="snum">{s.send + 1}</span>
              <span class="gname auto">{s.role}</span>
              <span class="caption">{s.note}</span>
              {#if s.send < 3}
                <span class="push">
                  <LampButton
                    label="Keep type"
                    size="sm"
                    on={s.keep}
                    name="Send {s.send + 1} keeps its type in this rack: {s.keep ? 'on' : 'off'}"
                    tip="fx.send_rack_override"
                    tipAction={p.tipAction}
                    ontoggle={(on) => p.onkeeptype?.(s.send, on)}
                  />
                </span>
              {:else}
                <button type="button" class="link push remove" aria-label="Remove send {s.send + 1}, {s.role}" data-tip="fx.send_remove" use:tipped={'fx.send_remove'} onclick={() => p.onremovesend?.(s.send)}>Remove</button>
              {/if}
            </div>
          {/each}
        </div>
      </div>

      <div class="group" role="group" aria-label="One Touch Settings for {p.oneTouch.style}">
        <div class="ghead">
          <span class="caption big">One Touch</span>
          <span class="caption end">for {p.oneTouch.style}</span>
        </div>
        <div class="grow-row tight">
          {#each p.oneTouch.slots as o, i (i)}
            <button
              type="button"
              class="ots"
              class:chosen={p.oneTouch.applied === i + 1}
              aria-pressed={p.oneTouch.applied === i + 1}
              aria-label="OTS {i + 1}: {o.rack ? `loads your rack ${o.rack}` : o.name}{p.oneTouch.applied === i + 1 ? ', applied' : ''}"
              data-tip="ots.{i + 1}"
              use:tipped={`ots.${i + 1}`}
              onclick={() => p.onots?.(i)}>{i + 1}</button
            >
          {/each}
          <span class="push">
            <LampButton
              label="Link"
              size="sm"
              on={p.oneTouch.link}
              name="One Touch Link: Main A to D pick OTS 1 to 4. {p.oneTouch.link ? 'On' : 'Off'}"
              tip="ots.link"
              tipAction={p.tipAction}
              ontoggle={(on) => p.onlink?.(on)}
            />
          </span>
        </div>
        <div class="grow-row">
          <span class="gname">Timing</span>
          <ChosenTabs
            size="compact"
            label="One Touch Link timing"
            tabs={[
              { id: 'immediate', label: 'Immediate', tip: 'ots.link_timing' },
              { id: 'mainChange', label: 'At Main change', tip: 'ots.link_timing' },
            ]}
            chosen={p.oneTouch.timing}
            tipAction={p.tipAction}
            onchoose={(id) => p.ontiming?.(id as 'immediate' | 'mainChange')}
          />
        </div>
        <div class="grow-row">
          {#each p.oneTouch.slots.map((o, i) => ({ ...o, i })).filter((o) => o.rack) as o (o.i)}
            <span class="gname">OTS {o.i + 1}</span>
            <span class="gtext">loads {o.rack}</span>
          {:else}
            <span class="gtext muted">The style's own sounds</span>
          {/each}
          <button type="button" class="link push" aria-label="Choose which of your racks each OTS loads, or the style's own" data-tip="ots.rack" use:tipped={'ots.rack'} onclick={() => p.onchangeots?.()}>Change</button>
        </div>
      </div>
    </div>
  </div>
</section>

<style>
  .rack {
    --control-height: var(--control-height-compact);
    display: flex;
    width: 100%;
    height: 468px;
    overflow: hidden;
    color: var(--t);
    font: var(--type-text);
    letter-spacing: var(--tracking-text);
  }
  .left {
    display: flex;
    flex: none;
    flex-direction: column;
    width: 320px;
  }
  .rule {
    flex: none;
    width: var(--line-width);
    margin: 0 var(--space-24);
    background: var(--line);
  }
  .page {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
  }

  /* The compact block (320 × 84). */
  .now {
    display: flex;
    flex: none;
    flex-direction: column;
    height: 84px;
  }
  .now-top {
    display: flex;
    align-items: center;
    gap: var(--space-8);
    height: 16px;
    white-space: nowrap;
  }
  .style {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    padding: 0 var(--space-6);
    background: var(--a);
    color: var(--g);
    font: var(--type-strong);
  }
  .bpm {
    margin-left: auto;
    font: var(--type-strong);
    font-variant-numeric: tabular-nums;
  }
  .unit {
    margin-left: 3px;
    color: var(--caption-ink);
    font: var(--type-text);
  }
  .run {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--d);
  }
  .run.on {
    background: var(--ok);
    box-shadow: var(--bg);
  }
  .now-main {
    display: flex;
    align-items: baseline;
    gap: var(--space-14);
    height: 48px;
    margin-top: var(--space-12);
    white-space: nowrap;
  }
  .chord {
    color: var(--a);
    font: var(--type-display);
    text-shadow: var(--ba);
  }
  .ext {
    font-weight: var(--weight-light);
  }
  .notes {
    color: var(--t2);
    font: var(--type-text);
    letter-spacing: 3px;
  }
  .section {
    margin-left: auto;
    font: var(--type-large);
  }
  .section[data-hue='intro'] {
    color: var(--intro);
  }
  .section[data-hue='main'] {
    color: var(--main);
  }
  .section[data-hue='ending'] {
    color: var(--ending);
  }
  .section[data-hue='brk'] {
    color: var(--brk);
  }
  .section[data-hue='fill'] {
    color: var(--fill);
  }

  /* Keyboard settings */
  .settings {
    display: flex;
    flex: none;
    flex-direction: column;
    margin-top: var(--space-16);
  }
  .srow {
    display: flex;
    align-items: center;
    gap: var(--space-8);
    height: 36px;
    box-sizing: border-box;
    border-bottom: var(--line-width) solid var(--line);
    white-space: nowrap;
  }
  .srow.head-row {
    height: 32px;
  }
  .word {
    color: var(--value-ink);
  }
  .grow {
    flex: 1;
    min-width: 0;
  }
  .num {
    width: 44px;
    font: var(--type-strong);
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .caption {
    color: var(--caption-ink);
    white-space: nowrap;
  }
  .end,
  .push {
    margin-left: auto;
  }

  .link {
    height: 28px;
    padding: 0;
    border: 0;
    background: none;
    color: var(--m);
    font: var(--type-text);
    white-space: nowrap;
    cursor: pointer;
  }
  .link.strong {
    color: var(--t);
  }
  .link.remove {
    color: var(--ending);
  }

  /* Page head */
  .phead {
    display: flex;
    flex: none;
    align-items: center;
    gap: var(--space-12);
    height: 36px;
    box-sizing: border-box;
    border-bottom: var(--line-width) solid var(--line);
    white-space: nowrap;
  }
  .rname {
    font: var(--type-strong);
  }
  .mine {
    color: var(--a);
    font: var(--type-strong);
  }
  .modified {
    display: flex;
    align-items: center;
    gap: var(--space-6);
  }
  .dot {
    flex: none;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--t);
  }
  .hint {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--caption-ink);
  }
  .saveas {
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: flex-end;
    gap: var(--space-8);
    min-width: 0;
  }
  .name {
    width: 240px;
    height: 28px;
    box-sizing: border-box;
    padding: 0 var(--space-8);
    border: 0;
    border-radius: var(--radius);
    background: var(--btn);
    color: var(--t);
    font: var(--type-text);
  }
  .commit {
    height: 28px;
    padding: 0 var(--space-16);
    border: 0;
    border-radius: var(--radius);
    background: var(--t);
    color: var(--g);
    font: var(--type-strong);
    cursor: pointer;
  }
  .commit:disabled {
    background: var(--btn);
    color: var(--d);
    cursor: default;
  }

  /* The parts table */
  .hands,
  .editor {
    display: flex;
    flex: none;
    flex-direction: column;
    margin-top: var(--space-8);
  }
  .hrow {
    display: grid;
    grid-template-columns: 32px 184px 56px 44px 40px 48px 48px 44px 64px 48px 112px minmax(0, 1fr);
    column-gap: var(--space-8);
    align-items: center;
    height: 48px;
    box-sizing: border-box;
    border-bottom: var(--line-width) solid var(--line);
  }
  .hrow.cols {
    height: 28px;
    color: var(--caption-ink);
    white-space: nowrap;
  }
  .cell {
    display: flex;
    align-items: center;
    min-width: 0;
  }
  .tag {
    font: var(--type-strong);
  }
  [data-hue='r1'] {
    color: var(--r1);
  }
  [data-hue='r2'] {
    color: var(--r2);
  }
  [data-hue='r3'] {
    color: var(--r3);
  }
  [data-hue='l'] {
    color: var(--l);
  }
  [data-hue='d'] {
    color: var(--d);
  }
  .sound {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: flex-start;
    min-width: 0;
    width: 100%;
    height: 44px;
    padding: 0;
    border: 0;
    background: none;
    color: inherit;
    text-align: left;
    cursor: pointer;
  }
  .sline {
    display: flex;
    align-items: center;
    gap: var(--space-6);
    max-width: 100%;
    height: 18px;
    white-space: nowrap;
  }
  .snum {
    flex: none;
    color: var(--caption-ink);
    font-family: var(--font-mono);
  }
  .sname {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--t);
  }
  .sname.off {
    color: var(--m);
  }
  .warn {
    flex: none;
    color: var(--warn);
  }
  .inst {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--caption-ink);
    white-space: nowrap;
  }
  .val {
    min-width: 0;
    height: 32px;
    padding: 0;
    border: 0;
    background: none;
    font: var(--type-strong);
    text-align: left;
    white-space: nowrap;
    cursor: pointer;
  }
  .ins {
    display: flex;
    align-items: baseline;
    gap: var(--space-6);
    min-width: 0;
    height: 32px;
    padding: 0;
    border: 0;
    background: none;
    color: var(--t);
    text-align: left;
    white-space: nowrap;
    cursor: pointer;
  }
  .iname {
    font: var(--type-text);
  }
  .iname.none {
    color: var(--m);
  }
  .plugin {
    gap: var(--space-8);
    white-space: nowrap;
  }

  /* The three groups */
  .groups {
    display: grid;
    flex: none;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    column-gap: var(--space-24);
    height: 156px;
    margin-top: var(--space-16);
  }
  .group {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .ghead {
    display: flex;
    align-items: center;
    gap: var(--space-8);
    height: 28px;
    box-sizing: border-box;
    border-bottom: var(--line-width) solid var(--line);
  }
  .caption.edited {
    color: var(--t);
    font: var(--type-strong);
  }
  .grow-row {
    display: flex;
    align-items: center;
    gap: var(--space-12);
    height: 32px;
    white-space: nowrap;
  }
  .grow-row.tight {
    gap: var(--space-4);
  }
  .gname {
    flex: none;
    width: 76px;
    color: var(--value-ink);
  }
  .gname.auto {
    width: auto;
  }
  .gtext {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--t2);
  }
  .gtext.muted {
    color: var(--caption-ink);
  }
  .sends {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
    overflow-y: auto;
  }
  .send {
    display: flex;
    align-items: center;
    gap: var(--space-8);
    height: 32px;
    white-space: nowrap;
  }
  .send .snum {
    width: 12px;
    font-family: inherit;
  }
  .ots {
    width: 32px;
    height: 28px;
    padding: 0;
    border: 0;
    border-radius: var(--radius);
    background: none;
    color: var(--tab-rest);
    font: var(--type-strong);
    cursor: pointer;
  }
  .ots.chosen {
    background: var(--t);
    color: var(--g);
  }
  .sound:focus-visible,
  .val:focus-visible,
  .ins:focus-visible,
  .link:focus-visible,
  .ots:focus-visible,
  .commit:focus-visible,
  .name:focus-visible {
    outline: var(--line-width) solid var(--focus);
    outline-offset: 0;
  }
</style>
