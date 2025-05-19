/* eslint-env node */
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const tailwindcssPlugin = require('eslint-plugin-tailwindcss');

module.exports = defineConfig([
  ...expoConfig,
  {
    plugins: {
      tailwindcss: tailwindcssPlugin,
    },
    rules: {
      ...tailwindcssPlugin.configs.recommended.rules,
      'react/display-name': 'off',
    },
  },
  {
    ignores: ['dist/*'],
  },
]);
