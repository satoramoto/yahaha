import { defineMain } from '@storybook/svelte-vite/node'

// The UI library's Storybook: every story and docs page under src/ui. The app shell's own
// components (src/lib, src/panels) are not in it, except the zen pilot's screen (src/panels/zen).
//
// With ZEN_STORYBOOK_URL set (zen's `npm run storybook:svelte`, e.g. http://localhost:6007), zen's
// Svelte Storybook is composed in as the "zen" ref, beside the app's own stories.
const zenStorybook = process.env.ZEN_STORYBOOK_URL

export default defineMain({
  framework: '@storybook/svelte-vite',
  stories: ['../src/ui/**/*.mdx', '../src/ui/**/*.stories.ts', '../src/panels/zen/**/*.stories.ts'],
  addons: [
    '@storybook/addon-docs',
    '@storybook/addon-themes',
    '@storybook/addon-a11y',
    'storybook-addon-pseudo-states',
  ],
  refs: zenStorybook ? { zen: { title: 'zen (Svelte)', url: zenStorybook } } : {},
  core: { disableTelemetry: true, disableWhatsNewNotifications: true },
})
