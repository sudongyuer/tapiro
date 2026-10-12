import { describe, expect, test } from 'bun:test';

import { LANGUAGES } from './languages';
import { resources } from './resources';

function keys(value: object, prefix = ''): string[] {
  return Object.entries(value).flatMap(([key, child]) =>
    typeof child === 'object' && child !== null
      ? keys(child, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  );
}

describe('resources', () => {
  const reference = keys(resources['zh-Hans'].translation).sort();

  test.each(LANGUAGES.map((language) => language.code))('%s has the same keys', (code) => {
    expect(keys(resources[code].translation).sort()).toEqual(reference);
  });

  test('no value is empty', () => {
    for (const { code } of LANGUAGES) {
      expect(JSON.stringify(resources[code].translation)).not.toContain('""');
    }
  });
});
