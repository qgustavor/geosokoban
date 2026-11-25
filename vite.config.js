import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({ registerType: 'autoUpdate' })
  ],
  resolve: {
    alias: {
      // The dictionaries contain message strings, not precompiled message functions.
      'vue-i18n': 'vue-i18n/dist/vue-i18n.esm-bundler.js'
    }
  },
  base: process.env.BASE_PATH || './',
  assetsInclude: ['**/*.geojson.gz'],
  build: { target: 'es2022' }
})
