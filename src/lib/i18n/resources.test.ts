import { describe, expect, test } from 'bun:test';

import { LANGUAGES } from './languages';
import { resources } from './resources';

function entries(value: object, prefix = ''): [string, string][] {
  return Object.entries(value).flatMap(([key, child]): [string, string][] =>
    typeof child === 'object' && child !== null
      ? entries(child, `${prefix}${key}.`)
      : [[`${prefix}${key}`, String(child)]],
  );
}

function keys(value: object) {
  return entries(value).map(([key]) => key);
}

function placeholders(value: object) {
  return Object.fromEntries(
    entries(value).map(([key, text]) => [
      key,
      [...text.matchAll(/{{\s*([^}]+?)\s*}}/g)].map((match) => match[1]).sort(),
    ]),
  );
}

describe('resources', () => {
  const reference = keys(resources['zh-Hans'].translation).sort();

  test.each(LANGUAGES.map((language) => language.code))('%s has the same keys', (code) => {
    expect(keys(resources[code].translation).sort()).toEqual(reference);
  });

  test.each(LANGUAGES.map((language) => language.code))(
    '%s uses the same {{placeholders}} as zh-Hans',
    (code) => {
      expect(placeholders(resources[code].translation)).toEqual(
        placeholders(resources['zh-Hans'].translation),
      );
    },
  );

  test('no value is empty', () => {
    for (const { code } of LANGUAGES) {
      expect(JSON.stringify(resources[code].translation)).not.toContain('""');
    }
  });
});
