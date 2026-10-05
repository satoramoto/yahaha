<!--
  SectionName: the playing section's name on the display, 44px light text in its hue with the
  hue's soft glow ("Main B"). Idle (the band stopped): muted, with no glow. A readout, not a
  control.
-->
<script lang="ts">
  type Props = {
    /** The section's shown name ("Main B", "Intro II", "Fill"). Empty: "—". */
    label: string
    /** The section hue. */
    hue?: 'intro' | 'main' | 'ending' | 'brk' | 'fill'
    /** The band is stopped: the name in muted grey without its glow (Stage.md › States, Stopped). */
    idle?: boolean
  }

  let { label, hue = 'main', idle = false }: Props = $props()
</script>

<span
  class="name"
  style:--hue={idle ? 'var(--m)' : `var(--${hue})`}
  style:--glow={idle ? 'none' : `var(--section-glow-${hue})`}
  data-hue={hue}
  data-idle={idle ? 'true' : undefined}>{label.trim() === '' ? '—' : label}</span
>

<style>
  .name {
    flex: none;
    font-family: var(--font-sans);
    font-size: var(--text-44);
    font-weight: var(--weight-light);
    font-variant-numeric: tabular-nums;
    line-height: var(--leading-44);
    letter-spacing: var(--tracking-44);
    color: var(--hue);
    text-shadow: var(--glow);
    white-space: nowrap;
  }
</style>
