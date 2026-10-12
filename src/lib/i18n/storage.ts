import { Settings } from 'react-native';

const KEY = 'tapiro.language';

export function readStoredLanguage(): string | null {
  const value = Settings.get(KEY);
  return typeof value === 'string' ? value : null;
}

export function writeStoredLanguage(language: string) {
  Settings.set({ [KEY]: language });
}
