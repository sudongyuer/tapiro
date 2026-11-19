import { describe, expect, test } from 'bun:test';
import { ESLint } from 'eslint';

import base from '../../eslint.config.js';

const config = (base as { ignores?: string[]; files?: string[] }[]).filter(
  (entry) => !(entry.ignores && !entry.files),
);

async function messages(path: string) {
  const eslint = new ESLint({ overrideConfigFile: true, overrideConfig: config });
  const [result] = await eslint.lintFiles([path]);
  return result.messages.filter(
    (m) => m.ruleId === 'no-restricted-syntax' && m.message.includes('DateTimeRow'),
  );
}

describe('compact DatePicker rule', () => {
  test('flags a DatePicker in the default or compact style', async () => {
    const found = await messages('scripts/lint-fixtures/compactDatePicker.bad.tsx');
    expect(found.map((m) => m.line)).toEqual([7, 10]);
  });

  test('allows the wheel and graphical styles', async () => {
    expect(await messages('scripts/lint-fixtures/compactDatePicker.good.tsx')).toEqual([]);
  });

  test('passes the wheel picker in the ETA sheet', async () => {
    expect(await messages('src/features/bounty/status/EtaSheet.tsx')).toEqual([]);
  });
});
