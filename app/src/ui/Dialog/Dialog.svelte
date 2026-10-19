<!--
  Dialog: a modal over the whole window (the Prompts boards). A scrim of the ground at most of its
  strength, and a centred panel on the ground with a 1px hairline outline (kit.md › Faces: no
  boxes but this one): the title in --type-strong, then the body. The body is the caller's snippet
  (its text and its faced buttons). Esc calls `onclose`. Focus moves into the panel when it opens
  (the first control, else the panel) and Tab / Shift+Tab stay inside it. Holds no state: the
  parent mounts it while the dialog is open.
-->
<script lang="ts">
  import type { Snippet } from 'svelte'

  type Props = {
    /** The title, and the dialog's accessible name. */
    title: string
    /** Drawn in the title's place when set (a title with a coloured part); `title` still names it. */
    heading?: Snippet
    /** The body: the question and its buttons. */
    children?: Snippet
    /** The panel's width in px (default 480). */
    width?: number
    /** Called on Esc. */
    onclose?: () => void
  }

  let { title, heading, children, width = 480, onclose }: Props = $props()

  let panel: HTMLDivElement | undefined = $state()
  const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

  const focusables = () => [...(panel?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])]

  // Focus goes into the panel on open, and back where it was on close.
  $effect(() => {
    const before = document.activeElement as HTMLElement | null
    ;(focusables()[0] ?? panel)?.focus()
    return () => before?.focus?.()
  })

  // Esc closes it; listened for in the capture phase so the window's own keys never see it.
  $effect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.stopPropagation()
      event.preventDefault()
      onclose?.()
    }
    window.addEventListener('keydown', keydown, true)
    return () => window.removeEventListener('keydown', keydown, true)
  })

  /** Tab and Shift+Tab wrap at the panel's ends. */
  function trap(event: KeyboardEvent) {
    if (event.key !== 'Tab') return
    const all = focusables()
    if (all.length === 0) {
      event.preventDefault()
      return
    }
    const first = all[0]
    const last = all[all.length - 1]
    const at = document.activeElement
    if (event.shiftKey && (at === first || at === panel)) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && at === last) {
      event.preventDefault()
      first.focus()
    }
  }
</script>

<div class="scrim">
  <div
    class="panel"
    role="dialog"
    aria-modal="true"
    aria-label={title}
    tabindex="-1"
    style:width={`${width}px`}
    bind:this={panel}
    onkeydown={trap}
  >
    <h2 class="title">
      {#if heading}{@render heading()}{:else}{title}{/if}
    </h2>
    <div class="body">{@render children?.()}</div>
  </div>
</div>

<style>
  .scrim {
    position: fixed;
    inset: 0;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--scrim);
  }
  .panel {
    display: flex;
    flex-direction: column;
    gap: var(--space-12);
    box-sizing: border-box;
    max-width: calc(100vw - 2 * var(--space-16));
    padding: var(--space-16);
    border-radius: var(--radius);
    background: var(--g);
    box-shadow: inset 0 0 0 var(--outline-width) var(--line);
    color: var(--t);
    font: var(--type-text);
    letter-spacing: var(--tracking-text);
  }
  .panel:focus {
    outline: none;
  }
  .title {
    margin: 0;
    color: var(--header-ink);
    font: var(--type-strong);
    letter-spacing: var(--tracking-strong);
  }
  .body {
    display: flex;
    flex-direction: column;
    gap: var(--space-12);
  }
</style>
