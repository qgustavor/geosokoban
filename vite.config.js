import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  base: process.env.BASE_PATH || './',
  assetsInclude: ['**/*.geojson.gz'],
  build: { target: 'es2022' }
})
