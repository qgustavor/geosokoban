export default {
  extends: ['stylelint-config-recommended'],
  ignoreFiles: ['dist/**', 'node_modules/**', 'public/licenses/**'],
  rules: {
    // Selector order alone cannot establish whether different UI elements compete.
    'no-descending-specificity': null
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
    }
  ]
}
