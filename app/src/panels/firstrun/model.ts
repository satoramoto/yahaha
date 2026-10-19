/**
 * FirstRun panel model: AppState → the props of ui/FirstRun (FirstRun board). The three
 * steps say whether styles were found, whether a SoundFont or plugin can play, and whether the
 * Launchkey is connected. The SoundFont folder isn't in AppState, so its step uses the README's
 * words for it.
 */
import type { AppState } from '../../lib/api/types'
import type { FirstRunStep } from '../../ui/FirstRun/FirstRun.svelte'

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`

export function stylesStep(s: Pick<AppState, 'library'>): FirstRunStep {
  const { count, roots, scanning } = s.library
  const where = roots.length ? roots.join(', ') : 'corpus/'
  return {
    tip: 'firstrun.step_styles',
    title: 'Styles',
    done: count > 0,
    detail: count > 0 ? `${plural(count, 'style')} in ${where}` : scanning ? `Looking in ${where}…` : `Put .sty, .prs or .sst files in ${where}`,
  }
}

export function soundsStep(s: Pick<AppState, 'io' | 'plugins'>): FirstRunStep {
  const font = s.io.soundFontFile ?? s.io.soundFonts[0] ?? null
  const plugins = s.plugins.available ? s.plugins.list.length : 0
  const parts = [font ? `SoundFont ${font}` : null, plugins ? plural(plugins, 'plugin') : null].filter((p) => p !== null)
  return {
    tip: 'firstrun.step_sounds',
    title: 'Sounds',
    done: parts.length > 0,
    detail: parts.length ? parts.join(', ') : 'Put a General MIDI .sf2 in soundfonts/',
  }
}

export function launchkeyStep(s: Pick<AppState, 'pads'>): FirstRunStep {
  return {
    tip: 'firstrun.step_launchkey',
    title: 'Launchkey',
    done: s.pads.connected,
    detail: s.pads.connected ? 'Connected' : 'No Launchkey: plug it in and it lights up here',
  }
}

export function firstRunView(s: AppState) {
  const [num, den] = s.style.timeSignature
  return {
    style: { name: s.style.name, meta: `${num}/${den}` },
    tempo: Math.round(s.transport.tempo),
    steps: [stylesStep(s), soundsStep(s), launchkeyStep(s)],
  }
}
