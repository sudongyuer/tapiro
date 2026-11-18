import { getLocales, useCalendars } from 'expo-localization';
import { createInstance } from 'i18next';
import { useCallback, type ReactNode } from 'react';
import { I18nextProvider, initReactI18next, useTranslation } from 'react-i18next';

import { setClockStyle } from '../deviceClock';
import { FALLBACK_LANGUAGE, LANGUAGES, isLanguage, type Language } from './languages';
import { resolveLanguage } from './resolve';
import { resources } from './resources';
import { latinSpacing } from './latinSpacing';
import { sentenceStart, sentenceStartOptions } from './sentenceStart';
import { readStoredLanguage, writeStoredLanguage } from './storage';

export { LANGUAGES, type Language } from './languages';

const i18next = createInstance();

export function initI18n() {
  if (i18next.isInitialized) return i18next;
  i18next
    .use(initReactI18next)
    .use(sentenceStart)
    .use(latinSpacing)
    .init({
      ...sentenceStartOptions,
      postProcess: [...sentenceStartOptions.postProcess, 'latinSpacing'],
      resources,
      lng: resolveLanguage({ stored: readStoredLanguage(), systemLocales: getLocales() }),
      fallbackLng: FALLBACK_LANGUAGE,
      initAsync: false,
      interpolation: { escapeValue: false },
    });
  return i18next;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  return (
    <I18nextProvider i18n={initI18n()}>
      <ClockStyle>{children}</ClockStyle>
    </I18nextProvider>
  );
}

function ClockStyle({ children }: { children: ReactNode }) {
  const { language } = useI18n();
  const [calendar] = useCalendars();
  setClockStyle(language, calendar.uses24hourClock !== false);
  return children;
}

export function useI18n() {
  const { t, i18n } = useTranslation();
  const language: Language = isLanguage(i18n.resolvedLanguage)
    ? i18n.resolvedLanguage
    : FALLBACK_LANGUAGE;
  const setLanguage = useCallback(
    (next: Language) => {
      writeStoredLanguage(next);
      return i18n.changeLanguage(next);
    },
    [i18n],
  );
  return { t, language, setLanguage, languages: LANGUAGES };
}
