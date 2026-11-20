import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { PURPOSE_KEYS_BY_FRAMEWORK, purposeStringProblems } from './check-purpose-strings.mjs';

const ROOT = join(import.meta.dir, '..');
const LOCALES = ['zh-Hans', 'en', 'ms'];

function nativeStrings(locale: string): Record<string, string> {
  return JSON.parse(readFileSync(join(ROOT, `src/lib/i18n/native/${locale}.json`), 'utf8')).ios;
}

describe('purposeStringProblems', () => {
  const full = {
    NSPhotoLibraryUsageDescription: 'Pick',
    NSPhotoLibraryAddUsageDescription: 'Save',
  };

  test('a linked Photos framework without the read purpose string fails, as build 20261120.1136 did', () => {
    const problems = purposeStringProblems({
      frameworks: ['Photos'],
      infoPlist: { NSPhotoLibraryAddUsageDescription: 'Save' },
      localized: { en: { NSPhotoLibraryAddUsageDescription: 'Save' } },
    });
    expect(problems).toEqual([
      'Info.plist: NSPhotoLibraryUsageDescription is missing or empty',
      'en.lproj: NSPhotoLibraryUsageDescription is missing or empty',
    ]);
  });

  test('every declared purpose string must be translated and non-empty', () => {
    const problems = purposeStringProblems({
      frameworks: [],
      infoPlist: { NSCameraUsageDescription: 'Scan' },
      localized: {
        en: { NSCameraUsageDescription: 'Scan' },
        ms: { NSCameraUsageDescription: ' ' },
      },
    });
    expect(problems).toEqual(['ms.lproj: NSCameraUsageDescription is missing or empty']);
  });

  test('a complete set passes', () => {
    expect(
      purposeStringProblems({
        frameworks: ['Photos', 'Foundation'],
        infoPlist: full,
        localized: { en: full },
      }),
    ).toEqual([]);
  });
});

test('every purpose string the linked frameworks need is in all three native locale files', () => {
  const appJson = readFileSync(join(ROOT, 'app.json'), 'utf8');
  const linked = ['Photos', 'PhotosUI', 'CoreLocation', 'Speech', 'AVFoundation', 'AVFAudio'];
  const needed = new Set(
    linked.flatMap(
      (name) => PURPOSE_KEYS_BY_FRAMEWORK[name as keyof typeof PURPOSE_KEYS_BY_FRAMEWORK],
    ),
  );
  expect(appJson).not.toContain('"photosPermission": false');
  for (const locale of LOCALES) {
    const strings = nativeStrings(locale);
    for (const key of needed)
      expect([locale, key, strings[key]?.trim() ? 'ok' : 'missing']).toEqual([locale, key, 'ok']);
  }
});
