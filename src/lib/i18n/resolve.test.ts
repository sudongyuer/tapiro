import { describe, expect, test } from 'bun:test';

import { resolveLanguage } from './resolve';

const locale = (
  languageCode: string,
  languageScriptCode?: string | null,
  regionCode?: string | null,
) => ({
  languageCode,
  languageScriptCode,
  regionCode,
});

describe('resolveLanguage', () => {
  test('stored choice wins over system locale', () => {
    expect(resolveLanguage({ stored: 'ms', systemLocales: [locale('en', 'Latn', 'US')] })).toBe(
      'ms',
    );
  });

  test('ignores an unsupported stored value', () => {
    expect(resolveLanguage({ stored: 'fr', systemLocales: [locale('en')] })).toBe('en');
  });

  test('matches simplified Chinese on language and script', () => {
    expect(resolveLanguage({ systemLocales: [locale('zh', 'Hans', 'MY')] })).toBe('zh-Hans');
  });

  test('traditional Chinese does not match zh-Hans', () => {
    expect(resolveLanguage({ systemLocales: [locale('zh', 'Hant', 'TW'), locale('en')] })).toBe(
      'en',
    );
  });

  test('Chinese without script falls back to region', () => {
    expect(resolveLanguage({ systemLocales: [locale('zh', null, 'CN')] })).toBe('zh-Hans');
    expect(resolveLanguage({ systemLocales: [locale('zh', null, 'TW'), locale('ms')] })).toBe('ms');
  });

  test('en-MY resolves to en and ms-MY to ms', () => {
    expect(resolveLanguage({ systemLocales: [locale('en', 'Latn', 'MY')] })).toBe('en');
    expect(resolveLanguage({ systemLocales: [locale('ms', 'Latn', 'MY')] })).toBe('ms');
  });

  test('uses the first matching locale in preference order', () => {
    expect(resolveLanguage({ systemLocales: [locale('fr'), locale('ms'), locale('en')] })).toBe(
      'ms',
    );
  });

  test('falls back to zh-Hans', () => {
    expect(resolveLanguage({ systemLocales: [locale('fr'), locale('ja')] })).toBe('zh-Hans');
    expect(resolveLanguage({ systemLocales: [] })).toBe('zh-Hans');
  });
});
