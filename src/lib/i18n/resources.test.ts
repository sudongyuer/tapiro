import { describe, expect, test } from 'bun:test';

import { CURRENCIES } from '@/lib/money';

import { LANGUAGES } from './languages';
import en from './native/en.json';
import ms from './native/ms.json';
import zhHans from './native/zh-Hans.json';
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

  test.each(LANGUAGES.map((language) => language.code))(
    '%s has no currency symbol inside a string',
    (code) => {
      const symbols = Object.values(CURRENCIES).map(({ symbol }) => symbol);
      const found = entries(resources[code].translation).filter(([, text]) =>
        symbols.some((symbol) => text.includes(symbol)),
      );
      expect(found).toEqual([]);
    },
  );

  const native = { 'zh-Hans': zhHans, en, ms } as const;

  test.each(LANGUAGES.map((language) => language.code))(
    '%s names the AI provider in full wherever Alibaba Cloud appears',
    (code) => {
      const provider = resources[code].translation.ask.provider;
      const texts = [
        ...entries(resources[code].translation).map(([, text]) => text),
        ...Object.values(native[code].ios),
      ];
      const partial = texts.filter(
        (text) => /阿里云|Alibaba Cloud/.test(text) && !text.includes(provider),
      );
      expect(partial).toEqual([]);
    },
  );

  test.each(LANGUAGES.map((language) => language.code))(
    '%s gives a real contact address in the legal pages',
    (code) => {
      expect(resources[code].translation.account.legal.contact).toMatch(/\S+@\S+\.\S+$/);
    },
  );
});
