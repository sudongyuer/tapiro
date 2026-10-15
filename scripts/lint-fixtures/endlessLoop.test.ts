import { describe, expect, test } from 'bun:test';
import { ESLint } from 'eslint';

import base from '../../eslint.config.js';

const config = (base as { ignores?: string[]; files?: string[] }[]).filter(
  (entry) => !(entry.ignores && !entry.files),
);

async function messages(file: string) {
  const eslint = new ESLint({ overrideConfigFile: true, overrideConfig: config });
  const [result] = await eslint.lintFiles([`scripts/lint-fixtures/${file}`]);
  return result.messages.filter((m) => m.ruleId === 'no-restricted-syntax');
}

describe('endless loop rule', () => {
  test('flags -1, Infinity and infinite CSS iteration', async () => {
    const found = await messages('endlessLoop.bad.ts');
    expect(found.map((m) => m.line)).toEqual([3, 4, 5]);
    expect(found[0].message).toContain('Endless loops keep the screen redrawing');
  });

  test('passes the settled welcome pattern', async () => {
    expect(await messages('endlessLoop.good.ts')).toEqual([]);
  });
});
