const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const eslintPluginPrettierRecommended = require('eslint-plugin-prettier/recommended');

const endlessLoopMessage =
  'Endless loops keep the screen redrawing; settle ambient motion after its purpose (AGENTS.md Animation). Disable with a reason only for state indicators like spinners.';

const textFieldMessage =
  "Use SyncedTextField from '@/ui/SyncedTextField': @expo/ui's TextField can drop onTextChange for the last keystroke of a fast burst, losing that character (retro 2026-10-27 item 11).";

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
    files: ['src/**/*.{ts,tsx}', 'scripts/lint-fixtures/**/*.ts'],
    ignores: ['src/ui/SyncedTextField.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: '@expo/ui/swift-ui', importNames: ['TextField'], message: textFieldMessage },
          ],
        },
      ],
    },
  },
  {
    ignores: ['dist/*', 'ios/*', 'scripts/check-specs.mjs', 'scripts/lint-fixtures/*.bad.ts'],
  },
]);
