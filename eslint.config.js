import { neostandard } from 'neostandard'
import pluginVue from 'eslint-plugin-vue'

export default [
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'src/assets/flags.js'
    ]
  },

  // Base neostandard rules (JavaScript Standard Style)
  ...neostandard({
    files: ['**/*.{js,mjs,vue}'],
    env: ['browser', 'node', 'worker'],
    noJsx: true
  }),

  // Vue recommended rules (includes structural template validation)
  ...pluginVue.configs['flat/recommended'],

  // Global script and SFC rules
  {
    files: ['**/*.{js,mjs,vue}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module'
    },
    rules: {
      // 1. Density control
      'max-statements-per-line': ['error', { max: 1 }],

      // 2. Block expansion
      'brace-style': ['error', '1tbs', { allowSingleLine: false }],

      // 3. Line length guardrail (warns at 120, ignores URLs, strings & templates)
      'max-len': [
        'warn',
        {
          code: 120,
          tabWidth: 2,
          ignoreUrls: true,
          ignoreStrings: true,
          ignoreTemplateLiterals: true,
          ignoreRegExpLiterals: true
        }
      ]
    }
  },

  // Vue-specific rules
  {
    files: ['**/*.vue'],
    rules: {
      'vue/component-api-style': ['error', ['script-setup']],
      'vue/multi-word-component-names': ['error', { ignores: ['App'] }],

      // Template density control
      'vue/max-attributes-per-line': [
        'error',
        {
          singleline: 3,
          multiline: 1
        }
      ],
      'vue/first-attribute-linebreak': [
        'error',
        {
          singleline: 'beside',
          multiline: 'below'
        }
      ],
      'vue/html-closing-bracket-newline': [
        'error',
        {
          singleline: 'never',
          multiline: 'always'
        }
      ],
      'vue/html-indent': ['error', 2],
      'vue/multiline-html-element-content-newline': 'error'
    }
  }
]
