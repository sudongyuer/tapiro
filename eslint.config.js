const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const eslintPluginPrettierRecommended = require('eslint-plugin-prettier/recommended');

module.exports = defineConfig([
  expoConfig,
  eslintPluginPrettierRecommended,
  {
    files: ['supabase/functions/**/*.ts'],
    rules: { 'import/no-unresolved': ['error', { ignore: ['^npm:', '^jsr:'] }] },
  },
  {
    ignores: ['dist/*', 'ios/*', 'scripts/check-specs.mjs'],
  },
]);
