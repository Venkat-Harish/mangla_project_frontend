import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

const paper = '#F5EFE4'

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: paper } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: paper } },
  },
  images: ['public/logo.svg'],
})
