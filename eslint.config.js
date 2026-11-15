import { neostandard } from 'neostandard'
import pluginVue from 'eslint-plugin-vue'

export default [
  { ignores: ['dist/**', 'node_modules/**', 'playwright-report/**', 'test-results/**', 'src/assets/flags.js'] },
  ...neostandard({
    files: ['**/*.{js,mjs,vue}'],
    env: ['browser', 'node', 'worker'],
    noJsx: true
  }),
  ...pluginVue.configs['flat/essential'],
  {
    files: ['**/*.vue'],
    rules: {
      'vue/component-api-style': ['error', ['script-setup']],
      'vue/multi-word-component-names': ['error', { ignores: ['App'] }]
    }
  }
]
