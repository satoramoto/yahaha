<!--
  The library file line under the Style map's families (StyleMap board): where the library is
  saved, Export… and Import…. Import… opens a path field under them (Enter or Import adds the
  file's sounds and rules). Commands: exportSoundLibrary, importSoundLibrary.
-->
<script lang="ts">
  import { app } from '../../lib/store.svelte'
  import { tip } from '../../lib/tooltip/tip.svelte'

  const sl = $derived(app.state.soundLibrary)
  let importing = $state(false)
  let importPath = $state('')

  function doImport() {
    const path = importPath.trim()
    if (!path) return
    app.send({ type: 'importSoundLibrary', path, replace: false, maps: true })
    importPath = ''
    importing = false
  }
</script>

<section class="file" aria-label="Library file">
  <span class="caption">Library file</span>
  <span class="path" title={sl.file ?? undefined}>{sl.file ?? 'Not saved (offline)'}</span>
  <div class="line">
    <button type="button" class="btn" use:tip={'sound.export'} onclick={() => app.send({ type: 'exportSoundLibrary', path: null })}>Export…</button>
    <button type="button" class="btn" aria-expanded={importing} use:tip={'sound.import'} onclick={() => (importing = !importing)}>Import…</button>
  </div>
  {#if importing}
    <div class="line">
      <input
        aria-label="Library file to import"
        placeholder="/path/to/sound-library.json"
        bind:value={importPath}
        use:tip={'sound.import_path'}
        onkeydown={(e) => {
          if (e.key === 'Enter') doImport()
        }}
      />
      <button type="button" class="btn" disabled={!importPath.trim()} use:tip={'sound.import'} onclick={doImport}>Import</button>
    </div>
  {/if}
</section>

<style>
  .file {
    display: flex;
    flex: none;
    flex-direction: column;
    gap: var(--space-4);
    min-width: 0;
  }
  .caption {
    color: var(--m);
    font: var(--type-text);
    font-size: 12px;
  }
  .path {
    overflow: hidden;
    color: var(--t2);
    font-family: var(--font-mono);
    font-size: 11px;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .line {
    display: flex;
    align-items: center;
    gap: var(--space-6);
    margin-top: var(--space-4);
  }
  .btn {
    flex: none;
    height: var(--control-height);
    margin: 0;
    padding: 0 var(--space-14);
    border: 0;
    border-radius: 4px;
    background: var(--btn);
    color: var(--t2);
    font: var(--type-text);
    cursor: pointer;
  }
  .btn:disabled {
    color: var(--d);
    cursor: default;
  }
  input {
    flex: 1;
    box-sizing: border-box;
    min-width: 0;
    height: 30px;
    padding: 0;
    border: 0;
    border-bottom: var(--line-width) solid var(--m);
    background: none;
    color: var(--t);
    font: var(--type-text);
    outline: none;
  }
  input:focus {
    border-bottom-color: var(--t);
  }
</style>
