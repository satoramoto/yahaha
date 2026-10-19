<!--
  OpenFileWait (Prompts-More board G): the card shown while the system file chooser is open. Says
  where to look, which files open and that the band keeps playing. No controls: the chooser's own
  Cancel ends it.
-->
<script lang="ts">
  import type { FilePick } from '../../lib/files'
  import Dialog from '../../ui/Dialog/Dialog.svelte'

  let { pick }: { pick: FilePick } = $props()

  const styles = $derived(pick.filter.name === 'Styles')
</script>

<Dialog title={pick.title} width={440}>
  <div class="wait" aria-busy="true" data-prompt="openFile" data-tip="prompt.open_file_wait">
    <div class="where"><span class="dot" aria-hidden="true"></span>Choose a file in the Finder window</div>
    <p class="body">
      {#if styles}
        Any style file opens, from anywhere. It joins your library if it isn't there yet, then loads. The band keeps playing meanwhile.
      {:else}
        Any of these files opens, from anywhere. The band keeps playing meanwhile.
      {/if}
    </p>
    <div class="types" role="list" aria-label="{pick.filter.name} it opens">
      {#each pick.filter.extensions as ext (ext)}<span role="listitem">.{ext}</span>{/each}
    </div>
  </div>
</Dialog>

<style>
  .wait {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .where {
    display: flex;
    align-items: center;
    gap: 10px;
    color: var(--t);
    font-size: 14px;
    white-space: nowrap;
  }
  .dot {
    flex: none;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--t);
  }
  .body {
    margin: 0;
    color: var(--m);
    font-size: 14px;
    line-height: 20px;
  }
  .types {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .types span {
    height: 22px;
    padding: 0 8px;
    border-radius: var(--radius);
    background: var(--btn);
    color: var(--t2);
    font-size: 12px;
    line-height: 22px;
  }
</style>
