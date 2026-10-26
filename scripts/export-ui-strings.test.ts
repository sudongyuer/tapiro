import { expect, test } from 'bun:test';

import { exportStrings, flatten } from './export-ui-strings';

test('flatten joins nested keys with dots', () => {
  expect(flatten({ a: { b: 'x' }, c: 'y' })).toEqual({ 'a.b': 'x', c: 'y' });
});

test('every locale exposes the same keys', () => {
  const all = exportStrings();
  const keys = (locale: string) => Object.keys(all[locale]).sort();
  expect(keys('en')).toEqual(keys('zh-Hans'));
  expect(keys('ms')).toEqual(keys('zh-Hans'));
});

test('a known key resolves per locale', () => {
  const all = exportStrings();
  expect(all['zh-Hans']['account.name.title']).toBe('你的名字');
  expect(all.en['account.name.title']).not.toBe(all['zh-Hans']['account.name.title']);
});

test('language names are native in every locale', () => {
  const all = exportStrings();
  for (const locale of ['zh-Hans', 'en', 'ms']) {
    expect(all[locale]['languages.en']).toBe('English');
    expect(all[locale]['languages.zh-Hans']).toBe('中文');
  }
});
