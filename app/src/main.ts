import { mount } from 'svelte'
import '@fontsource/barlow/400.css'
import '@fontsource/barlow/500.css'
import '@fontsource/barlow/600.css'
import '@fontsource/barlow-condensed/500.css'
import '@fontsource/barlow-condensed/600.css'
import '@fontsource/barlow-condensed/700.css'
// The UI library's fonts and tokens (app/src/ui, the Stage). Its themes apply under
// `[data-theme]`; it comes before app.css so that on :root the old shell's clashing names
// (--bg, --line, --key-white, --key-black) keep their old values, while StageScreen's box,
// which carries `data-theme` itself, gets the library's.
import '@fontsource/dm-sans/200.css'
import '@fontsource/dm-sans/300.css'
import '@fontsource/dm-sans/400.css'
import '@fontsource/dm-sans/500.css'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/500.css'
import './ui/tokens/index.css'
import './app.css'
import App from './App.svelte'
import { connect } from './lib/api/session'
import { applyUrlParams } from './lib/urlparams'

const session = await connect()
applyUrlParams()
const app = mount(App, { target: document.getElementById('app')!, props: { session } })

export default app
