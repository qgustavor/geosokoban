import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({ registerType: 'autoUpdate' })
  ],
  base: process.env.BASE_PATH || './',
  assetsInclude: ['**/*.geojson.gz'],
  build: { target: 'es2022' }
})
