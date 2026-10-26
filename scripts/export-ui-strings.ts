import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { LANGUAGES } from '../src/lib/i18n/languages';
import en from '../src/lib/i18n/locales/en';
import ms from '../src/lib/i18n/locales/ms';
import zhHans from '../src/lib/i18n/locales/zh-Hans';

type Tree = { [key: string]: string | Tree };

export function flatten(tree: Tree, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') out[path] = value;
    else Object.assign(out, flatten(value, path));
  }
  return out;
}

function native(locale: string): Record<string, string> {
  const file = resolve(import.meta.dir, `../src/lib/i18n/native/${locale}.json`);
  return flatten({ native: JSON.parse(readFileSync(file, 'utf8')) as Tree });
}

function languages(): Record<string, string> {
  return Object.fromEntries(
    LANGUAGES.map((language) => [`languages.${language.code}`, language.nativeName]),
  );
}

export function exportStrings(): Record<string, Record<string, string>> {
  return {
    'zh-Hans': { ...flatten(zhHans as Tree), ...native('zh-Hans'), ...languages() },
    en: { ...flatten(en as Tree), ...native('en'), ...languages() },
    ms: { ...flatten(ms as Tree), ...native('ms'), ...languages() },
  };
}

if (import.meta.main) {
  const target = resolve(import.meta.dir, '../.verify/ui-strings.json');
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `${JSON.stringify(exportStrings(), null, 2)}\n`);
}
