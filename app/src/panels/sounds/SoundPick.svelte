<!--
  SoundPick (stub): a keyboard part's quick sound list (SoundPick board), open while
  `ui.soundList` is set (the Stage's sound row sets it), anchored under `list.anchor`. The
  sounds lane builds it; Esc (`ui.escape`) closes it. Renders nothing yet.
-->
<script lang="ts">
  import type { SoundList } from '../../lib/store.svelte'

  let { list: _list }: { list: SoundList } = $props()
</script>
