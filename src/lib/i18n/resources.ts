import en from './locales/en';
import ms from './locales/ms';
import zhHans from './locales/zh-Hans';

export const resources = {
  'zh-Hans': { translation: zhHans },
  en: { translation: en },
  ms: { translation: ms },
} as const;

export type Translation = typeof zhHans;
