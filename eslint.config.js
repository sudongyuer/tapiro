const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const eslintPluginPrettierRecommended = require('eslint-plugin-prettier/recommended');

const endlessLoopMessage =
  'Endless loops keep the screen redrawing; settle ambient motion after its purpose (AGENTS.md Animation). Disable with a reason only for state indicators like spinners.';

const textFieldMessage =
  "Use SyncedTextField from '@/ui/SyncedTextField': @expo/ui's TextField can drop onTextChange for the last keystroke of a fast burst, losing that character (retro 2026-10-27 item 11).";

const reducedMotionMessage =
  "Use useMotionReduced from '@/ui/theme/motion': it also honours the verify-mode -uiVerifyReduceMotion launch argument, which simctl needs because it cannot switch the system setting.";

const endlessLoopSelectors = [
  "CallExpression[callee.name='withRepeat'][arguments.1.operator='-'][arguments.1.argument.value=1]",
  "CallExpression[callee.name='withRepeat'][arguments.1.name='Infinity']",
  "CallExpression[callee.name='withRepeat'][arguments.1.object.name='Number'][arguments.1.property.name='POSITIVE_INFINITY']",
  "Property[key.name='animationIterationCount'][value.value='infinite']",
].map((selector) => ({ selector, message: endlessLoopMessage }));

const compactDatePickerSelector = {
  selector:
    "JSXOpeningElement[name.name='DatePicker']:not(:has(CallExpression[callee.name='datePickerStyle'] > Literal[value=/^(wheel|graphical)$/]))",
  message:
    "Use DateTimeRow from 'tapiro-kit': @expo/ui's compact DatePicker sizes its label from the previous date and falls back to the short style (「10/12/26」) when the date widens (BP-13, bounty post plan rulings 27-28).",
};

module.exports = defineConfig([
  expoConfig,
  eslintPluginPrettierRecommended,
  {
    files: ['supabase/functions/**/*.ts'],
    rules: { 'import/no-unresolved': ['error', { ignore: ['^npm:', '^jsr:'] }] },
  },
  {
    files: ['src/**/*.{ts,tsx}', 'scripts/lint-fixtures/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': ['error', ...endlessLoopSelectors, compactDatePickerSelector],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}', 'scripts/lint-fixtures/**/*.ts'],
    ignores: ['src/ui/SyncedTextField.tsx', 'src/ui/theme/motion.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: '@expo/ui/swift-ui', importNames: ['TextField'], message: textFieldMessage },
            {
              name: 'react-native-reanimated',
              importNames: ['useReducedMotion'],
              message: reducedMotionMessage,
            },
          ],
        },
      ],
    },
  },
  {
    ignores: [
      'dist/*',
      'ios/*',
      'scripts/check-specs.mjs',
      'scripts/lint-fixtures/*.bad.ts',
      'scripts/lint-fixtures/*.bad.tsx',
    ],
  },
]);
