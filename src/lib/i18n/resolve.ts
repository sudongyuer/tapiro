import { FALLBACK_LANGUAGE, isLanguage, type Language } from './languages';

export type SystemLocale = {
  languageCode: string | null;
  languageScriptCode?: string | null;
  regionCode?: string | null;
};

function matchLocale(locale: SystemLocale): Language | null {
  const code = locale.languageCode?.toLowerCase();
  if (code === 'en') return 'en';
  if (code === 'ms') return 'ms';
  if (code !== 'zh') return null;
  const script = locale.languageScriptCode?.toLowerCase();
  if (script) return script === 'hans' ? 'zh-Hans' : null;
  const region = locale.regionCode?.toUpperCase();
  return region === 'CN' || region === 'SG' ? 'zh-Hans' : null;
}

export function resolveLanguage({
  stored,
  systemLocales,
}: {
  stored?: string | null;
  systemLocales: readonly SystemLocale[];
}): Language {
  if (isLanguage(stored)) return stored;
  for (const locale of systemLocales) {
    const match = matchLocale(locale);
    if (match) return match;
  }
  return FALLBACK_LANGUAGE;
}
