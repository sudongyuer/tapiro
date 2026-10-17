const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const eslintPluginPrettierRecommended = require('eslint-plugin-prettier/recommended');

const endlessLoopMessage =
  'Endless loops keep the screen redrawing; settle ambient motion after its purpose (AGENTS.md Animation). Disable with a reason only for state indicators like spinners.';

const endlessLoopSelectors = [
  "CallExpression[callee.name='withRepeat'][arguments.1.operator='-'][arguments.1.argument.value=1]",
  "CallExpression[callee.name='withRepeat'][arguments.1.name='Infinity']",
  "CallExpression[callee.name='withRepeat'][arguments.1.object.name='Number'][arguments.1.property.name='POSITIVE_INFINITY']",
  "Property[key.name='animationIterationCount'][value.value='infinite']",
].map((selector) => ({ selector, message: endlessLoopMessage }));

module.exports = defineConfig([
  expoConfig,
  eslintPluginPrettierRecommended,
  {
    files: ['supabase/functions/**/*.ts'],
    rules: { 'import/no-unresolved': ['error', { ignore: ['^npm:', '^jsr:'] }] },
  },
  {
    files: ['src/**/*.{ts,tsx}', 'scripts/lint-fixtures/**/*.ts'],
    rules: { 'no-restricted-syntax': ['error', ...endlessLoopSelectors] },
  },
  {
    ignores: ['dist/*', 'ios/*', 'scripts/check-specs.mjs', 'scripts/lint-fixtures/*.bad.ts'],
  },
]);
