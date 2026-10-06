<!--
  SettingsSystem: the Settings screen's System page, in three columns. Audio: the built-in synth,
  its output pair and buffer, master volume, and the latency, sample rate and CPU readouts (CPU
  above 70 % in trouble red). MIDI: which inputs yahaha listens to (all, or one lamp per input),
  then the virtual output, the Launchkey and its LED colours. Library: the style folders (read
  only) and Rescan, the SoundFonts found, and the app's theme. The Screen draws the page header;
  this draws only the columns. Controlled: every control reports a SystemChange through onchange
  and changes nothing itself.
-->
<script lang="ts">
  import type { Action } from 'svelte/action'
  import Button from '../Button/Button.svelte'
  import ChosenTabs from '../ChosenTabs/ChosenTabs.svelte'
  import GroupHeader from '../GroupHeader/GroupHeader.svelte'
  import LampButton from '../LampButton/LampButton.svelte'
  import LineSlider from '../LineSlider/LineSlider.svelte'
  import SettingsRow from '../SettingsRow/SettingsRow.svelte'
  import StatusDot from '../StatusDot/StatusDot.svelte'
  import type { SystemChange, SystemPageData } from '../Settings/types'

  type Props = {
    /** Everything the page shows: the audio, MIDI and library state and the theme. */
    data: SystemPageData
    /** The app's tooltip action (`use:tip`), applied to every control. */
    tipAction?: Action<HTMLElement, string>
    /** Called with the change a control asks for. The page never changes `data` itself. */
    onchange?: (change: SystemChange) => void
  }

  let { data, tipAction, onchange }: Props = $props()

  const uid = $props.id()

  /** Above this CPU load the readout turns trouble red. */
  const CPU_TROUBLE = 70

  const off = $derived(!data.synthRunning)

  const outputTabs = $derived(
    data.outputPairs.map((pair) => ({
      id: String(pair.first),
      label: pair.label,
      name: `Outputs ${pair.label}`,
      tip: 'audio.output',
      disabled: off,
    })),
  )
  const bufferTabs = $derived(
    data.buffers.map((frames) => ({
      id: String(frames),
      label: String(frames),
      name: `${frames} frames`,
      tip: 'audio.buffer',
      disabled: off,
    })),
  )

  const inputsLocked = $derived(data.inputsFixed || data.allInputs === null)
  const listenTabs = $derived([
    { id: 'all', label: 'All inputs', tip: 'midi.merge_all', disabled: inputsLocked },
    { id: 'only', label: 'Only these', tip: 'midi.merge_all', disabled: inputsLocked },
  ])
  const listenChosen = $derived(data.allInputs === null ? null : data.allInputs ? 'all' : 'only')
  /** The per-input lamps are pressable only while "Only these" is chosen. */
  const lampsLocked = $derived(data.inputsFixed || data.allInputs !== false)

  const ledsLocked = $derived(data.ledsFixed || data.paletteLeds === null)
  const ledTabs = $derived([
    { id: 'rgb', label: 'RGB', tip: 'midi.palette_leds', disabled: ledsLocked },
    { id: 'palette', label: 'Palette', tip: 'midi.palette_leds', disabled: ledsLocked },
  ])
  const ledChosen = $derived(data.paletteLeds === null ? null : data.paletteLeds ? 'palette' : 'rgb')

  const themeTabs = $derived([
    { id: 'system', label: 'System', name: 'System: follow the computer', tip: 'app.theme', disabled: true },
    { id: 'dark', label: 'Dark', tip: 'app.theme' },
    { id: 'light', label: 'Light', tip: 'app.theme' },
  ])

  const cpuTrouble = $derived(data.cpu !== null && data.cpu > CPU_TROUBLE)
  const cpuFraction = $derived(data.cpu === null ? 0 : Math.max(0, Math.min(1, data.cpu / 100)))

  const folders = $derived(data.styleFolders.length)
  const fonts = $derived(data.soundFonts.length)

  function plural(n: number, one: string, many: string): string {
    return `${n} ${n === 1 ? one : many}`
  }

  function chooseOutput(id: string) {
    const first = Number(id)
    if (first !== data.outputFirst) onchange?.({ type: 'outputPair', first })
  }

  function chooseBuffer(id: string) {
    const frames = Number(id)
    if (frames !== data.buffer) onchange?.({ type: 'buffer', frames })
  }

  function chooseListen(id: string) {
    const all = id === 'all'
    if (all !== data.allInputs) onchange?.({ type: 'allInputs', all })
  }

  function chooseLeds(id: string) {
    const on = id === 'palette'
    if (on !== data.paletteLeds) onchange?.({ type: 'paletteLeds', on })
  }

  function chooseTheme(id: string) {
    if ((id === 'dark' || id === 'light') && id !== data.theme) onchange?.({ type: 'theme', theme: id })
  }

  function rescan() {
    if (!data.scanning) onchange?.({ type: 'rescan' })
  }
</script>

<div class="page">
  <!-- Audio -->
  <section class="column" aria-labelledby="{uid}-audio">
    <GroupHeader title="Audio" level={3} id="{uid}-audio">
      {#snippet end()}
        <span class="caption">Master is <span class="value">fader 9</span></span>
      {/snippet}
    </GroupHeader>
    <SettingsRow label="Built-in synth" hint={off ? 'Not running' : ''}>
      <LampButton
        label={data.synthOn ? 'On' : 'Off'}
        on={data.synthOn}
        size="sm"
        width={64}
        disabled={off}
        name="Built-in synth"
        tip="audio.synth_on"
        {tipAction}
        ontoggle={(on) => onchange?.({ type: 'synth', on })}
      />
    </SettingsRow>
    <SettingsRow label="Output pair">
      <ChosenTabs
        tabs={outputTabs}
        chosen={data.outputFirst === null ? null : String(data.outputFirst)}
        size="compact"
        label="Output pair"
        {tipAction}
        onchoose={chooseOutput}
      />
    </SettingsRow>
    <SettingsRow label="Buffer">
      <ChosenTabs
        tabs={bufferTabs}
        chosen={data.buffer === null ? null : String(data.buffer)}
        size="compact"
        label="Buffer size in frames"
        {tipAction}
        onchoose={chooseBuffer}
      />
    </SettingsRow>
    <SettingsRow label="Latency">
      <span class="readout"
        >{#if data.latencyMs === null}<span class="caption">—</span>{:else}<span class="value"
            >{data.latencyMs}</span
          ><span class="caption">ms</span>{/if}</span
      >
    </SettingsRow>
    <SettingsRow label="Master volume">
      <LineSlider
        value={data.master ?? 0}
        min={0}
        max={127}
        name="Master volume (fader 9)"
        valueText={data.master === null ? '—' : undefined}
        disabled={off || data.master === null}
        tip="mixer.master"
        {tipAction}
        onchange={(volume) => onchange?.({ type: 'master', volume })}
      />
    </SettingsRow>
    <SettingsRow label="Sample rate">
      <span class="readout"
        >{#if data.sampleRateKhz === null}<span class="caption">—</span>{:else}<span class="value"
            >{data.sampleRateKhz}</span
          ><span class="caption">kHz</span>{/if}</span
      >
    </SettingsRow>
    <SettingsRow label="CPU">
      {#if data.cpu === null}
        <span class="caption">—</span>
      {:else}
        <span class="meter" class:trouble={cpuTrouble} aria-hidden="true"
          ><span class="meter-fill" style:width={`${cpuFraction * 100}%`}></span></span
        >
        <span
          class="readout"
          class:trouble={cpuTrouble}
          role="img"
          aria-label={`CPU ${data.cpu} percent${cpuTrouble ? `, above ${CPU_TROUBLE}` : ''}`}
          ><span class="value">{data.cpu}</span><span class="caption">%</span></span
        >
      {/if}
    </SettingsRow>
    {#if data.dropouts > 0}
      <SettingsRow label="Dropouts">
        <span class="readout trouble"
          ><span class="value">{data.dropouts}</span><span class="caption">lately</span></span
        >
      </SettingsRow>
    {/if}
    <p class="help">
      Smaller buffers answer your hands faster. Raise it if you hear clicks. The output pair is the two outputs yahaha
      plays through.
    </p>
  </section>

  <!-- MIDI -->
  <section class="column" aria-labelledby="{uid}-midi">
    <GroupHeader title="MIDI inputs" level={3} id="{uid}-midi">
      {#snippet end()}
        <span class="status"
          ><StatusDot hue={data.launchkeyConnected ? 'ok' : 'd'} hollow={!data.launchkeyConnected} /><span
            class="caption">{data.launchkeyConnected ? 'Launchkey connected' : 'Launchkey not connected'}</span
          ></span
        >
      {/snippet}
    </GroupHeader>
    <SettingsRow label="Listen to">
      <ChosenTabs
        tabs={listenTabs}
        chosen={listenChosen}
        size="compact"
        label="Which MIDI inputs yahaha listens to"
        {tipAction}
        onchoose={chooseListen}
      />
    </SettingsRow>
    {#each data.inputs as input (input.name)}
      {@const on = data.allInputs === true ? true : input.listening}
      <SettingsRow label={input.name} labelWidth={176} hint={input.pads ? 'pads' : ''}>
        <LampButton
          label={on ? 'On' : 'Off'}
          {on}
          size="sm"
          width={64}
          disabled={lampsLocked}
          name={`Listen to ${input.name}`}
          tip="midi.input"
          {tipAction}
          ontoggle={(next) => onchange?.({ type: 'input', name: input.name, on: next })}
        />
      </SettingsRow>
    {:else}
      <p class="empty">No MIDI inputs found</p>
    {/each}
    <div class="sub">
      <GroupHeader title="Output and Launchkey" level={3} />
    </div>
    <SettingsRow label="Virtual output">
      <span class="readout"
        >{#if data.outputPort}<span class="value">{data.outputPort}</span><span class="caption">· always on</span
          >{:else}<span class="caption">not open</span>{/if}</span
      >
    </SettingsRow>
    <SettingsRow label="Launchkey">
      <span class="readout wraps"
        >{#if data.launchkeyConnected}<span class="value">{data.launchkeyName}</span>
          <span class="caption">· DAW mode · reconnects itself</span>{:else}<span class="caption"
            >Not connected</span
          >{/if}</span
      >
    </SettingsRow>
    <SettingsRow label="LED colours">
      <ChosenTabs
        tabs={ledTabs}
        chosen={ledChosen}
        size="compact"
        label="Launchkey LED colours"
        {tipAction}
        onchoose={chooseLeds}
      />
    </SettingsRow>
    <p class="help">
      All inputs: yahaha plays from every MIDI keyboard it finds. {data.outputPort || 'The virtual output'} sends what you
      play to other apps.
    </p>
  </section>

  <!-- Library and App -->
  <section class="column" aria-labelledby="{uid}-library">
    <GroupHeader title="Style folders" level={3} id="{uid}-library">
      {#snippet end()}
        <span class="caption">read-only</span>
      {/snippet}
    </GroupHeader>
    {#if folders > 0}
      <ul class="folders">
        {#each data.styleFolders as folder (folder)}
          <li class="folder" title={folder}>{folder}</li>
        {/each}
      </ul>
    {:else}
      <p class="empty">No folders reported</p>
    {/if}
    <div class="line">
      <span class="readout"
        ><span class="value">{data.styleCount.toLocaleString('en-US')}</span><span class="caption"
          >{data.styleCount === 1 ? 'style' : 'styles'} in {plural(folders, 'folder', 'folders')}</span
        ></span
      >
      <Button
        label={data.scanning ? 'Scanning…' : 'Rescan'}
        waiting={data.scanning}
        disabled={data.rescanFixed}
        name={data.scanning ? 'Scanning the style folders' : 'Rescan the style folders'}
        tip="settings.rescan"
        {tipAction}
        onpress={rescan}
      />
    </div>
    <div class="sub">
      <GroupHeader title="SoundFonts" level={3} />
    </div>
    <div class="line">
      {#if fonts > 0}
        <span class="readout"
          ><span class="value">{fonts}</span><span class="caption"
            >{fonts === 1 ? 'font' : 'fonts'}{#if data.soundFontMain}&nbsp;·&nbsp;<span class="value plain"
                >{data.soundFontMain}</span
              >{/if}</span
          ></span
        >
      {:else}
        <span class="caption">No SoundFonts found</span>
      {/if}
    </div>
    <div class="sub">
      <GroupHeader title="App" level={3} />
    </div>
    <SettingsRow label="Theme">
      <ChosenTabs
        tabs={themeTabs}
        chosen={data.theme}
        size="compact"
        label="Theme"
        {tipAction}
        onchoose={chooseTheme}
      />
    </SettingsRow>
    <p class="help">
      yahaha reads your styles from these folders. Copy styles in, then Rescan. The theme is kept on this computer.
    </p>
  </section>
</div>

<style>
  .page {
    /* The page area under the Screen's page header, and the CPU meter: sizes the scale lacks. */
    --system-page-width: 1048px;
    --system-meter-width: 64px;
    --system-meter-line: 2px;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    column-gap: var(--space-24);
    align-items: start;
    box-sizing: border-box;
    width: var(--system-page-width);
    max-width: 100%;
    color: var(--value-ink);
    font: var(--type-text);
    letter-spacing: var(--tracking-text);
    font-variant-numeric: tabular-nums;
  }
  .column {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .sub {
    margin-top: var(--space-12);
  }
  .caption {
    color: var(--caption-ink);
  }
  .value {
    color: var(--value-ink);
    font: var(--type-strong);
    letter-spacing: var(--tracking-strong);
    font-variant-numeric: tabular-nums;
  }
  .value.plain {
    font: var(--type-text);
    letter-spacing: var(--tracking-text);
  }
  .readout {
    display: inline-flex;
    align-items: baseline;
    gap: var(--space-4);
    min-width: 0;
    white-space: nowrap;
  }
  .readout.wraps {
    display: inline;
    white-space: normal;
  }
  .trouble .value,
  .trouble .caption {
    color: var(--rec);
  }
  .meter {
    position: relative;
    flex: none;
    width: var(--system-meter-width);
    height: var(--system-meter-line);
    background: var(--line);
  }
  .meter-fill {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    background: var(--neutral);
  }
  .meter.trouble .meter-fill {
    background: var(--rec);
  }
  .status {
    display: inline-flex;
    align-items: center;
    gap: var(--space-6);
  }
  .folders {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  /* A block (not flex) so the ellipsis works; 10 + 16 + 10 = a row's 36. */
  .folder {
    padding: var(--space-10) 0;
    overflow: hidden;
    color: var(--value-ink);
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .line {
    display: flex;
    align-items: center;
    gap: var(--space-12);
    min-height: var(--group-header-height);
  }
  .empty {
    display: flex;
    align-items: center;
    min-height: var(--group-header-height);
    margin: 0;
    color: var(--caption-ink);
  }
  .help {
    margin: var(--space-12) 0 0;
    color: var(--caption-ink);
  }
</style>
