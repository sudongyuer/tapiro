import { describe, expect, test } from 'bun:test';
import { ESLint } from 'eslint';

import base from '../../eslint.config.js';

const config = (base as { ignores?: string[]; files?: string[] }[]).filter(
  (entry) => !(entry.ignores && !entry.files),
);

async function messages(path: string) {
  const eslint = new ESLint({ overrideConfigFile: true, overrideConfig: config });
  const [result] = await eslint.lintFiles([path]);
  return result.messages.filter((m) => m.ruleId === 'no-restricted-imports');
}

describe('TextField import rule', () => {
  test('flags a direct TextField import', async () => {
    const found = await messages('scripts/lint-fixtures/textField.bad.ts');
    expect(found.map((m) => m.line)).toEqual([1]);
    expect(found[0].message).toContain('SyncedTextField');
  });

  test('allows other @expo/ui names and the TextField types', async () => {
    expect(await messages('scripts/lint-fixtures/textField.good.ts')).toEqual([]);
  });

  test('allows the shared component itself', async () => {
    expect(await messages('src/ui/SyncedTextField.tsx')).toEqual([]);
  });
});
