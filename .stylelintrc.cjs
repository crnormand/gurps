module.exports = {
  extends: ['stylelint-config-standard-scss'],
  plugins: ['stylelint-scss'],
  customSyntax: 'postcss-scss',
  rules: {
    'selector-combinator-space-before': 'always',
    'selector-combinator-space-after': [
      'always',
      {
        ignore: ['multi-line'],
      },
    ],
    'selector-list-comma-space-after': 'always',
    'selector-list-comma-space-before': 'never',
  },
}
