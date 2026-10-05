<!--
  StagePlayground: a story-only wrapper for the Stage Playground story. It takes the same props as
  Stage, keeps what the controls change in its own state (seeded from the props, and re-seeded when
  a prop changes in the Controls panel), and renders Stage with that state. Every handler calls the
  prop's callback too, so each press still shows in the Actions panel. No timers: every change
  happens on a press.

  Pads, deterministic: stopped, a Main (or Break) becomes the playing section at once, and an Intro
  or Ending arms (press again to disarm). Running, a section pad is queued (`next`); press the queued
  pad again and it lands (`playing`); a landed Ending plays out and the band stops. Start (pad 16 or
  the transport) turns an armed pad into the playing section and queues the Main that was playing.
  Stop clears whatever was queued or armed. Sync Start, Auto Fill and Sync Stop toggle.
-->
<script lang="ts">
  import type { ComponentProps } from 'svelte'
  import { displayStopped } from '../Display/Display.fixtures'
  import type { BankLamp, FaderStrip } from '../FaderBank/types'
  import type { KnobItem } from '../KnobBank/types'
  import type { PadItem } from '../PadBank/types'
  import Stage from './Stage.svelte'
  import { stageLayerValues, stageStyles, stageStyleTempo } from './Stage.fixtures'

  type Props = ComponentProps<typeof Stage>
  type Hue = NonNullable<Props['display']['nowPlaying']['hue']>

  let p: Props = $props()

  /** The non-Vol layers: the word at the top of a part strip, the word in its name, its tooltip key. */
  const LAYERS: Record<string, { short: string; word: string; tip: string }> = {
    pan: { short: 'Pan', word: 'Pan', tip: 'mixer.part.pan' },
    reverb: { short: 'Rev', word: 'Reverb', tip: 'mixer.part.reverb' },
    chorus: { short: 'Cho', word: 'Chorus', tip: 'mixer.part.chorus' },
    delay: { short: 'Dly', word: 'Delay', tip: 'mixer.part.variation' },
  }
  const RATES = ['1/4', '1/8', '1/16', '1/32']
  const TEMPO_MIN = 40
  const TEMPO_MAX = 280
  const SECTIONS = new Set<PadItem['family']>(['intro', 'main', 'ending', 'brk', 'fill'])
  const NBSP = new RegExp(String.fromCharCode(0xa0), 'g')
  /** The word a section pad's accessible name gets in each waiting or playing state. */
  const PAD_WORDS: Partial<Record<PadItem['state'], string>> = { playing: 'playing', next: 'queued', armed: 'armed' }

  const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))
  /** Steps a counter like "2/6" round its range. */
  function cycle(count: string, delta: number): string {
    const [n, m] = count.split('/').map(Number)
    if (!m) return count
    return `${((n - 1 + delta + m) % m) + 1}/${m}`
  }

  // ---- App bar and section row
  let chosen = $derived(p.appBar.chosen ?? null)
  let section = $derived({ ...p.sectionRow })

  // ---- Faders: the page, the layer, every layer's values, the lamps
  let page = $derived(p.faders.page)
  let layer = $derived(p.faders.layer)
  let values = $derived(seedValues(p.faders.strips, p.faders.layer))
  let partOn = $derived(lampState(p.faders.partLamps))
  let functionOn = $derived(lampState(p.faders.functionLamps))

  function seedValues(strips: FaderStrip[], seedLayer: string): Record<string, number[]> {
    const seeded = Object.fromEntries(Object.entries(stageLayerValues).map(([id, list]) => [id, [...list]]))
    const volume = seeded.volume ?? []
    strips.forEach((strip, i) => {
      if (seedLayer !== 'volume' && i < 4) (seeded[seedLayer] ??= [])[i] = strip.level
      else volume[i] = strip.level
    })
    seeded.volume = volume
    return seeded
  }

  function lampState(lamps: BankLamp[]): Record<string, boolean> {
    return Object.fromEntries(lamps.map((lamp) => [lamp.id, lamp.on]))
  }

  /** A part strip's value as shown on a layer ("40"; pan "C", "L24", "R24"). */
  function shown(layerId: string, value: number): string {
    if (layerId !== 'pan') return `${value}`
    return value === 64 ? 'C' : value < 64 ? `L${64 - value}` : `R${value - 64}`
  }

  let strips: FaderStrip[] = $derived(
    p.faders.strips.map((strip, i) => {
      const part = i < 4 && (strip.kind === 'part' || strip.kind === 'off')
      const kind = part ? (partOn[strip.id] === false ? 'off' : 'part') : strip.kind
      const base = strip.faderName.split(',')[0]
      const look = i < 4 ? LAYERS[layer] : undefined
      if (look) {
        const value = values[layer]?.[i] ?? strip.level
        const text = shown(layer, value)
        return {
          ...strip,
          kind,
          level: value,
          value: `${look.short} ${text}`,
          away: undefined,
          faderName: `${base}, ${look.word} ${text}`,
          tip: look.tip,
        }
      }
      if (strip.kind === 'parked') return strip
      const value = values.volume?.[i] ?? strip.level
      const away = strip.away === undefined ? '' : ', hardware fader away (soft takeover)'
      return {
        ...strip,
        kind,
        level: value,
        value: `${value}`,
        faderName: `${base}, level ${value}${away}`,
        tip: part ? `mixer.panel.${strip.id}` : strip.tip,
      }
    }),
  )

  let partLamps: BankLamp[] = $derived(
    p.faders.partLamps.map((lamp) => {
      const on = partOn[lamp.id] ?? lamp.on
      return { ...lamp, on, label: on ? 'On' : 'Off', name: lamp.name?.replace(/ (on|off)\./, on ? ' on.' : ' off.') }
    }),
  )
  let functionLamps: BankLamp[] = $derived(
    p.faders.functionLamps.map((lamp) => ({ ...lamp, on: functionOn[lamp.id] ?? lamp.on })),
  )

  // ---- Knobs
  let knobs = $derived(p.knobs.knobs.map((knob) => ({ ...knob })))
  let knobCount = $derived(p.knobs.count)

  function stepKnob(knob: KnobItem, delta: number): KnobItem {
    if (knob.unused) return knob
    if (knob.value === 'Off' || knob.value === 'On') {
      const on = delta > 0
      return { ...knob, value: on ? 'On' : 'Off', fraction: on ? 1 : 0 }
    }
    const rate = RATES.indexOf(knob.value)
    if (rate >= 0) {
      const next = clamp(rate + delta, 0, RATES.length - 1)
      return { ...knob, value: RATES[next], fraction: next / (RATES.length - 1) }
    }
    const max = knob.unit === '%' ? 100 : 127
    const next = clamp((Number(knob.value) || 0) + delta, 0, max)
    return { ...knob, value: `${next}`, fraction: next / max }
  }

  // ---- Transport, tempo, display
  let running = $derived(p.transport.running ?? false)
  let fading = $derived(p.transport.fading ?? false)
  let bpm = $derived(p.display.nowPlaying.bpm)
  let styleIndex = $derived(stageStyles.findIndex((style) => style.styleName === p.display.styleLine.styleName))
  let oneTouch = $derived(p.display.styleLine.oneTouch ?? 0)
  let status = $derived({ ...p.status })

  let knobsShown: KnobItem[] = $derived(
    knobs.map((knob) =>
      knob.code === 'Tempo'
        ? { ...knob, value: `${bpm}`, fraction: (bpm - TEMPO_MIN) / (TEMPO_MAX - TEMPO_MIN) }
        : knob,
    ),
  )

  // ---- Pads
  let pads = $derived(p.pads.pads.map((pad) => ({ ...pad })))
  let padCount = $derived(p.pads.count)

  const isSection = (pad: PadItem) => SECTIONS.has(pad.family)
  const plain = (label: string) => label.replace(NBSP, ' ')

  /** Sets pad `index` to `state`, and turns every other section pad that is in `state` idle. */
  function only(list: PadItem[], index: number, state: PadItem['state']): PadItem[] {
    return list.map((pad, i) =>
      i === index ? { ...pad, state } : isSection(pad) && pad.state === state ? { ...pad, state: 'idle' } : pad,
    )
  }

  function start() {
    running = true
    const armed = pads.findIndex((pad) => pad.state === 'armed')
    if (armed < 0) return
    pads = pads.map((pad, i) =>
      i === armed ? { ...pad, state: 'playing' } : pad.state === 'playing' && isSection(pad) ? { ...pad, state: 'next' } : pad,
    )
  }

  function stop() {
    running = false
    pads = pads.map((pad) => (pad.state === 'next' || pad.state === 'armed' ? { ...pad, state: 'idle' } : pad))
  }

  function pressPad(index: number) {
    const pad = pads[index]
    if (!pad || pad.state === 'dark') return
    if (pad.family === 'start') return running ? stop() : start()
    if (pad.family === 'util') {
      if (plain(pad.label) === 'Tap') return
      pads = pads.map((it, i) => (i === index ? { ...it, state: it.state === 'playing' ? 'idle' : 'playing' } : it))
      return
    }
    if (!running) {
      if (pad.family === 'intro' || pad.family === 'ending') {
        if (pad.state === 'armed') pads = pads.map((it, i) => (i === index ? { ...it, state: 'idle' } : it))
        else pads = only(pads, index, 'armed')
      } else {
        pads = only(pads, index, 'playing').map((it) => (it.state === 'next' ? { ...it, state: 'idle' } : it))
      }
      return
    }
    if (pad.state === 'playing') return
    if (pad.state !== 'next') {
      pads = only(pads, index, 'next')
      return
    }
    if (pad.family === 'ending') {
      pads = pads.map((it, i) => (i === index ? { ...it, state: 'idle' } : it))
      stop()
      return
    }
    pads = only(pads, index, 'playing')
  }

  let padsShown: PadItem[] = $derived(
    pads.map((pad) => {
      if (pad.family === 'start') {
        const word = running ? 'running' : 'stopped'
        return {
          ...pad,
          state: running ? 'running' : 'idle',
          name: `Start / Stop, ${word} (pad 16; the transport Start / Stop is the same control)`,
        }
      }
      if (!isSection(pad) || pad.state === 'dark') return pad
      const label = plain(pad.label)
      const word = PAD_WORDS[pad.state]
      return { ...pad, name: word ? `${label}, ${word}` : undefined }
    }),
  )

  let display = $derived.by(() => {
    const base = running ? p.display : displayStopped
    const playingPad = pads.find((pad) => isSection(pad) && pad.state === 'playing')
    const nextPad =
      pads.find((pad) => pad.state === 'next') ?? (running ? undefined : pads.find((pad) => pad.state === 'armed'))
    const style = styleIndex >= 0 ? stageStyles[styleIndex] : {}
    return {
      styleLine: { ...base.styleLine, ...style, oneTouch },
      nowPlaying: {
        ...base.nowPlaying,
        bpm,
        running,
        playing: playingPad ? plain(playingPad.label) : base.nowPlaying.playing,
        hue: playingPad ? (playingPad.family as Hue) : base.nowPlaying.hue,
        next: nextPad ? plain(nextPad.label) : '',
        fill: nextPad && running ? base.nowPlaying.fill || 'fill lands after bar 4' : '',
      },
      soundRow: {
        ...base.soundRow,
        parts: base.soundRow.parts.map((part) => ({ ...part, off: partOn[part.id] === false })),
      },
    }
  })
</script>

<Stage
  {...p}
  appBar={{ ...p.appBar, chosen }}
  sectionRow={section}
  {display}
  faders={{ ...p.faders, page, layer, strips, partLamps, functionLamps }}
  knobs={{ ...p.knobs, knobs: knobsShown, count: knobCount }}
  pads={{ ...p.pads, pads: padsShown, count: padCount }}
  transport={{ running, fading }}
  {status}
  onchoose={(id) => {
    p.onchoose?.(id)
    chosen = id
  }}
  onaccomp={(on) => {
    p.onaccomp?.(on)
    section = { ...section, accomp: on }
  }}
  onmetronome={(on) => {
    p.onmetronome?.(on)
    section = { ...section, metronome: on }
  }}
  onmetronomesettings={() => {
    p.onmetronomesettings?.()
    section = { ...section, metronomeOpen: !section.metronomeOpen }
  }}
  onunison={(on) => {
    p.onunison?.(on)
    section = { ...section, unison: on }
  }}
  onhelp={(on) => {
    p.onhelp?.(on)
    section = { ...section, help: on }
  }}
  onpanic={() => {
    p.onpanic?.()
    status = { ...status, text: 'All notes off', error: false, seq: (status.seq ?? 0) + 1 }
  }}
  onprev={() => {
    p.onprev?.()
    styleIndex = (Math.max(styleIndex, 0) - 1 + stageStyles.length) % stageStyles.length
  }}
  onnext={() => {
    p.onnext?.()
    styleIndex = (styleIndex + 1) % stageStyles.length
  }}
  ononetouch={(n) => {
    p.ononetouch?.(n)
    oneTouch = n
  }}
  onchoosePage={(id) => {
    p.onchoosePage?.(id)
    page = id
  }}
  onpagebutton={() => {
    p.onpagebutton?.()
    page = p.faders.pageTabs.find((tab) => tab.id !== page)?.id ?? page
  }}
  onchooseLayer={(id) => {
    p.onchooseLayer?.(id)
    layer = id
  }}
  onlevel={(id, level) => {
    p.onlevel?.(id, level)
    const i = strips.findIndex((strip) => strip.id === id)
    if (i < 0) return
    const key = i < 4 && LAYERS[layer] ? layer : 'volume'
    values = { ...values, [key]: (values[key] ?? []).map((v, j) => (j === i ? level : v)) }
  }}
  onlamp={(id, on) => {
    p.onlamp?.(id, on)
    if (id in partOn) partOn = { ...partOn, [id]: on }
    else functionOn = { ...functionOn, [id]: on }
  }}
  onpageup={() => {
    p.onpageup?.()
    knobCount = cycle(knobCount, -1)
  }}
  onpagedown={() => {
    p.onpagedown?.()
    knobCount = cycle(knobCount, 1)
  }}
  onstep={(index, delta) => {
    p.onstep?.(index, delta)
    const knob = knobs[index]
    if (!knob) return
    if (knob.code === 'Tempo') bpm = clamp(bpm + delta, TEMPO_MIN, TEMPO_MAX)
    else knobs = knobs.map((it, i) => (i === index ? stepKnob(it, delta) : it))
  }}
  onbankup={() => {
    p.onbankup?.()
    padCount = cycle(padCount, -1)
  }}
  onbankdown={() => {
    p.onbankdown?.()
    padCount = cycle(padCount, 1)
  }}
  onpadpress={(index) => {
    p.onpadpress?.(index)
    pressPad(index)
  }}
  onstartstop={() => {
    p.onstartstop?.()
    if (running) stop()
    else start()
  }}
  onstop={() => {
    p.onstop?.()
    stop()
  }}
  onstoplong={() => {
    p.onstoplong?.()
    stop()
    fading = false
  }}
  onfade={() => {
    p.onfade?.()
    fading = !fading
  }}
  ontempoup={(down) => {
    p.ontempoup?.(down)
    if (down) bpm = clamp(bpm + 1, TEMPO_MIN, TEMPO_MAX)
  }}
  ontempodown={(down) => {
    p.ontempodown?.(down)
    if (down) bpm = clamp(bpm - 1, TEMPO_MIN, TEMPO_MAX)
  }}
  onstyletempo={() => {
    p.onstyletempo?.()
    bpm = stageStyleTempo
  }}
  onclear={() => {
    p.onclear?.()
    status = { ...status, text: null }
  }}
/>
