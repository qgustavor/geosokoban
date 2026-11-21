export default {
  extends: ['stylelint-config-recommended'],
  ignoreFiles: ['dist/**', 'node_modules/**', 'public/licenses/**'],
  rules: {
    // Selector order alone cannot establish whether different UI elements compete.
    'no-descending-specificity': null,
    // UI and illustration colors belong in the palette, including SFC styles.
    'color-no-hex': true,
    'color-named': 'never',
    'function-disallowed-list': ['rgb', 'rgba', 'hsl', 'hsla', 'hwb', 'lab', 'lch', 'oklab', 'oklch', 'color']
  },
  overrides: [
    {
      files: ['**/*.vue'],
      customSyntax: 'postcss-html',
      rules: {
        // These are Vue compiler features, not unknown CSS syntax.
        'selector-pseudo-class-no-unknown': [
          true,
          { ignorePseudoClasses: ['deep', 'global', 'slotted'] }
        ],
        'function-no-unknown': [true, { ignoreFunctions: ['v-bind'] }],
        'declaration-property-value-no-unknown': [
          true,
          { ignoreProperties: { '/.*/': '/v-bind\\(.+\\)/' } }
        ]
      }
    },
    {
      files: ['src/styles/theme.css', 'src/styles/art-tokens.css', 'src/styles/biome-tokens.css'],
      rules: {
        'color-no-hex': null,
        'color-named': null,
        'function-disallowed-list': null
      }
    }
  ]
}
