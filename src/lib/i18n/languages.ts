export const LANGUAGES = [
  { code: 'zh-Hans', nativeName: '中文' },
  { code: 'en', nativeName: 'English' },
  { code: 'ms', nativeName: 'Bahasa Melayu' },
] as const;

export type Language = (typeof LANGUAGES)[number]['code'];

export const FALLBACK_LANGUAGE: Language = 'zh-Hans';

export function isLanguage(value: unknown): value is Language {
  return LANGUAGES.some((language) => language.code === value);
}
