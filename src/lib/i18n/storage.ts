import { Settings } from 'react-native';

import { uiVerify } from '@/lib/uiVerify';

const KEY = 'tapiro.language';

let verifyChoice: string | null = null;

export function readStoredLanguage(): string | null {
  if (uiVerify) return verifyChoice;
  const value = Settings.get(KEY);
  return typeof value === 'string' ? value : null;
}

export function writeStoredLanguage(language: string) {
  if (uiVerify) verifyChoice = language;
  else Settings.set({ [KEY]: language });
}
