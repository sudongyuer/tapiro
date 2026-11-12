import type { Language } from '@/lib/i18n';

export type TranslationFailure =
  'offline' | 'providerError' | 'unreadable' | 'busy' | 'hungry' | 'capped' | 'needsUpdate';

export type Translation =
  | { state: 'waiting' }
  | { state: 'shown'; text: string }
  | { state: 'failed'; reason: TranslationFailure };

export type MessageTranslator = {
  subscribe(listener: () => void): () => void;
  get(messageId: string, to: Language): Translation | null;
  translate(messageId: string, text: string, to: Language): void;
  hide(messageId: string, to: Language): void;
  feed(): void;
};
