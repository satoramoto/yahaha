<!--
  GoldenOverlay: draws the Golden tree inside it (its children) as it is rendered: every slot's
  cut line, each leaf's inset (dashed) and the golden spiral in each phi box. It checks the rules
  as it goes and draws what breaks one red: a slot whose content overflows it (or has text cut
  short), and a row or column whose cells don't add up to its box. What it finds is data: the
  wrapper carries `data-overflow` and `data-rows-off` (counts), `onreport` gets the whole report,
  and with `report` a line under the tree says it ("knob 54 × 88 · spare 0 × 27 · overflow 2
  (Retrig rate, StyMuteA) · rows add up"). It re-measures when anything inside changes size.
  A design aid, never on in the app.
-->
<script lang="ts">
  import type { Snippet } from 'svelte'
  import {
    lineAddsUp,
    report as makeReport,
    spiralPath,
    summary,
    type BoxMeasure,
    type GoldenReport,
    type LineMeasure,
    type Rect,
    type SlotMeasure,
  } from './golden'

  type Props = {
    /** Draw the lines (off: the tree is still checked and reported). */
    show?: boolean
    /** The report line under the tree. */
    report?: boolean
    /** The shape the report line names the size of (`knob`); the first fitted box by default. */
    reportShape?: string
    /** What the overlay finds, each time it changes. */
    onreport?: (report: GoldenReport) => void
    /** The Golden tree to draw and check. */
    children?: Snippet
  }

  let { show = true, report = false, reportShape, onreport, children }: Props = $props()

  let root: HTMLDivElement | undefined = $state()
  let content: HTMLDivElement | undefined = $state()
  let found: GoldenReport = $state({ slots: [], overflow: [], rowsOff: [], rows: 0, boxes: [], spirals: [] })
  let size = $state({ w: 0, h: 0 })
  let insets: Rect[] = $state([])
  let offLines: Rect[] = $state([])

  /** A rectangle relative to the overlay. */
  function within(origin: DOMRect, el: Element): Rect {
    const r = el.getBoundingClientRect()
    return { x: r.left - origin.left, y: r.top - origin.top, w: r.width, h: r.height }
  }

  /** The text of each element in a leaf that is cut short (an ellipsis, or clipped). */
  function clippedIn(leaf: HTMLElement): string[] {
    const out: string[] = []
    for (const el of [leaf, ...leaf.querySelectorAll<HTMLElement>('*')]) {
      if (el.scrollWidth <= el.clientWidth + 1 || el.clientWidth === 0) continue
      const style = getComputedStyle(el)
      if (style.overflowX === 'visible') continue
      const text = el.textContent?.trim()
      if (text && el.children.length === 0) out.push(text)
    }
    return out
  }

  function nameOf(el: HTMLElement): string {
    return (
      el.getAttribute('data-golden-name') ??
      el.getAttribute('aria-label') ??
      el.querySelector('[aria-label]')?.getAttribute('aria-label') ??
      (el.textContent?.trim().slice(0, 24) || el.getAttribute('data-golden') || 'slot')
    )
  }

  function measure() {
    if (!root || !content) return
    const origin = root.getBoundingClientRect()
    const slots: SlotMeasure[] = []
    const boxes: BoxMeasure[] = []
    const lines: LineMeasure[] = []
    const spirals: Rect[] = []
    const pads: Rect[] = []

    for (const holder of content.querySelectorAll<HTMLElement>('[data-golden-slots]')) {
      const kind = holder.getAttribute('data-golden-slots')
      const cells = [...holder.children] as HTMLElement[]
      for (const el of cells) {
        const cut = el.hasAttribute('data-golden')
        // A leaf that only wraps another Golden tree (a control cell) is checked through that tree.
        if (!cut && el.querySelector('[data-golden-slots]')) continue
        const rect = within(origin, el)
        let client = { w: el.clientWidth, h: el.clientHeight }
        let scroll = { w: el.scrollWidth, h: el.scrollHeight }
        if (cut) {
          // A nested primitive overflows when its own cells reach past its box (a square too deep
          // for it, a row that is too long); what overflows inside a leaf is that leaf's.
          const own = el.querySelector<HTMLElement>('[data-golden-slots]')
          const box = (own ?? el).getBoundingClientRect()
          let right = box.right
          let bottom = box.bottom
          for (const c of own?.children ?? []) {
            const r = c.getBoundingClientRect()
            right = Math.max(right, r.right)
            bottom = Math.max(bottom, r.bottom)
          }
          client = { w: box.width, h: box.height }
          scroll = { w: right - box.left, h: bottom - box.top }
        }
        slots.push({ rect, client, scroll, clipped: cut ? [] : clippedIn(el), name: nameOf(el), cut })
        if (!cut) {
          const style = getComputedStyle(el)
          const t = parseFloat(style.paddingTop) || 0
          const l = parseFloat(style.paddingLeft) || 0
          if (t > 0 || l > 0) pads.push({ x: rect.x + l, y: rect.y + t, w: rect.w - 2 * l, h: rect.h - 2 * t })
        }
      }
      if (kind === 'row' || kind === 'column') {
        const across = kind === 'row'
        const along = across ? holder.clientWidth : holder.clientHeight
        const sum = cells.reduce((n, el) => n + (across ? el.getBoundingClientRect().width : el.getBoundingClientRect().height), 0)
        const adds = holder.getAttribute('data-golden-adds')
        const name = holder.closest('[data-golden]')?.getAttribute('data-golden-name') ?? kind
        const rect = within(origin, holder)
        // Checked from the names when the row has a shape; else measured: its cells must fill it.
        lines.push({ name, rect, along, sum, declared: adds === null ? undefined : adds === 'yes' })
      }
    }

    // A grid's fitted cells are boxes, the cell their slot: listed first, as they say what room
    // the page gives a control.
    for (const holder of content.querySelectorAll<HTMLElement>('[data-golden-slots="grid"][data-cell]')) {
      const columns = Number(getComputedStyle(holder).getPropertyValue('--golden-columns')) || 1
      const rows = Number(getComputedStyle(holder).getPropertyValue('--golden-rows')) || 1
      const cellW = holder.clientWidth / columns
      const cellH = holder.clientHeight / rows
      for (const el of holder.children) {
        const rect = within(origin, el)
        boxes.push({ shape: holder.getAttribute('data-cell') ?? '', rect, slot: { x: rect.x, y: rect.y, w: cellW, h: cellH } })
      }
    }
    for (const fit of content.querySelectorAll<HTMLElement>('[data-golden-fit][data-shape]')) {
      const rect = within(origin, fit)
      const slot = fit.parentElement ? within(origin, fit.parentElement) : rect
      const shape = fit.getAttribute('data-shape') ?? ''
      boxes.push({ shape, rect, slot })
      if (shape === 'phi' && fit.getAttribute('data-orient') === 'wide') spirals.push(rect)
    }

    const next = makeReport(slots, boxes, lines, spirals)
    found = next
    size = { w: origin.width, h: origin.height }
    insets = pads
    offLines = lines.filter((l) => !lineAddsUp(l)).map((l) => l.rect)
  }

  let last = ''
  $effect(() => {
    const text = JSON.stringify({ o: found.overflow, r: found.rowsOff, b: found.boxes.map((b) => [b.shape, Math.round(b.w), Math.round(b.h)]) })
    if (text === last) return
    last = text
    onreport?.(found)
  })

  $effect(() => {
    if (!content) return
    const target = content
    let frame = 0
    const schedule = () => {
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        measure()
      })
    }
    measure()
    const resize = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(schedule)
    const observe = () => {
      if (!resize) return
      resize.observe(target)
      for (const el of target.querySelectorAll('[data-golden-slots], [data-golden-slots] > *')) resize.observe(el)
    }
    observe()
    const mutations = new MutationObserver(() => {
      observe()
      schedule()
    })
    mutations.observe(target, { childList: true, subtree: true, characterData: true })
    return () => {
      if (frame) cancelAnimationFrame(frame)
      resize?.disconnect()
      mutations.disconnect()
    }
  })

  let line = $derived(summary(found, reportShape))
</script>

<div class="overlay" bind:this={root} data-golden="overlay" data-overflow={found.overflow.length} data-rows-off={found.rowsOff.length}>
  <div class="content" bind:this={content}>{@render children?.()}</div>
  {#if show}
    <svg class="lines" width={size.w} height={size.h} viewBox="0 0 {size.w || 1} {size.h || 1}" aria-hidden="true">
      {#each insets as r, i (i)}
        <rect class="inset" x={r.x} y={r.y} width={Math.max(0, r.w)} height={Math.max(0, r.h)} />
      {/each}
      {#each found.slots as slot, i (i)}
        <rect class="cut" class:off={slot.off} x={slot.rect.x} y={slot.rect.y} width={slot.rect.w} height={slot.rect.h} />
      {/each}
      {#each offLines as r, i (i)}
        <rect class="cut off" x={r.x} y={r.y} width={r.w} height={r.h} />
      {/each}
      {#each found.spirals as r, i (i)}
        <path class="spiral" d={spiralPath(r)} />
      {/each}
    </svg>
  {/if}
  {#if report}
    <p class="report" class:off={found.overflow.length > 0 || found.rowsOff.length > 0}>{line}</p>
  {/if}
</div>

<style>
  /* It fills its parent; a story showing a tree on its own sizes it with --golden-sample-width and
     --golden-sample-height (Storybook's `parameters.sample`). */
  .overlay {
    position: relative;
    box-sizing: border-box;
    width: var(--golden-sample-width, 100%);
    height: var(--golden-sample-height, 100%);
    min-width: 0;
    min-height: 0;
  }
  .content {
    width: 100%;
    height: 100%;
  }
  .lines {
    position: absolute;
    top: 0;
    left: 0;
    overflow: visible;
    pointer-events: none;
  }
  .lines * {
    fill: none;
    vector-effect: non-scaling-stroke;
  }
  .cut {
    stroke: var(--golden-overlay-cut);
    stroke-width: var(--line-width);
  }
  .cut.off {
    fill: var(--golden-overlay-off-fill);
    stroke: var(--golden-overlay-off);
    stroke-width: var(--header-rule-width);
  }
  .inset {
    stroke: var(--golden-overlay-inset);
    stroke-width: var(--line-width);
    stroke-dasharray: 4 4;
  }
  .spiral {
    stroke: var(--golden-overlay-spiral);
    stroke-width: var(--header-rule-width);
  }
  .report {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    margin: var(--fib-5) 0 0;
    color: var(--m);
    font: var(--type-text);
    letter-spacing: var(--tracking-text);
    font-variant-numeric: tabular-nums;
  }
  .report.off {
    color: var(--t);
  }
</style>
