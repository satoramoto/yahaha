<!--
  HarmArpPage: the Harm/Arp display page, in the Stage's display box (ui/Stage's `page` slot, sized
  by --page-width × --page-height). A stub until its lane builds it (docs/specs/push/Harmony.md).
-->
<script lang="ts">
  import type { PageProps } from '../stage/page.svelte'

  let { tipAction }: PageProps = $props()
</script>

<section class="soon" aria-label="Harm/Arp: coming soon" use:tipAction={'nav.harmony'}>
  <h1>Coming soon</h1>
  <p>The Harm/Arp page is being rebuilt.</p>
</section>

<style>
  .soon {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    width: var(--page-width);
    height: var(--page-height);
  }
  h1 {
    margin: 0;
    font-size: 44px;
    font-weight: 300;
    letter-spacing: -1px;
  }
  p {
    margin: 0;
    color: var(--m);
    font-size: 14px;
  }
</style>
