<!--
  ComingSoon: a page tab whose page isn't built yet. The kit's app bar (so every tab stays one
  click away) over a centred "Coming soon" with the page's name. Laid out at the Stage's
  1440 × 900, in the kit's tokens, like the Stage it stands in for.
-->
<script lang="ts">
  import type { ComponentProps } from 'svelte'
  import type { Action } from 'svelte/action'
  import AppBar from '../../ui/AppBar/AppBar.svelte'

  type AppBarProps = ComponentProps<typeof AppBar>
  let {
    appBar,
    tipAction,
    onchoose,
    onhealth,
  }: {
    appBar: Omit<AppBarProps, 'tipAction' | 'onchoose' | 'onhealth'>
    tipAction?: Action<HTMLElement, string>
    onchoose?: AppBarProps['onchoose']
    onhealth?: AppBarProps['onhealth']
  } = $props()

  const name = $derived([...appBar.displayTabs, ...appBar.fullTabs].find((t) => t.id === appBar.chosen)?.label ?? '')
</script>

<div class="screen">
  <AppBar {...appBar} {tipAction} {onchoose} {onhealth} />
  <main class="soon" aria-label={`${name}: coming soon`}>
    <h1>Coming soon</h1>
    <p>The {name} page is being rebuilt. Choose Stage to play.</p>
  </main>
</div>

<style>
  .screen {
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    width: var(--screen-width);
    height: var(--screen-height);
    padding: var(--screen-pad);
    overflow: hidden;
    background: var(--g);
    color: var(--t);
    font-family: var(--font-sans);
  }
  .soon {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
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
