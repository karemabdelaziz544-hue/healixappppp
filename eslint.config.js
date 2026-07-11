// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    ignores: [
      '**/constants/AppTheme.ts',
      '**/constants/strings.ts',
      '**/constants/subscriptionConfig.ts'
    ],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value=/^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/]',
          message: 'Do not use raw hex color literals. Use AppColors or NutritionalColors from constants/AppTheme instead.'
        },
        {
          selector: 'TemplateLiteral[expressions.length=0] > TemplateElement[value.raw=/^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/]',
          message: 'Do not use raw hex color literals. Use AppColors or NutritionalColors from constants/AppTheme instead.'
        }
      ]
    }
  }
]);
