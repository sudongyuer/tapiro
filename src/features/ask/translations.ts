import { isLanguage, type Language } from '@/lib/i18n/languages';
import type { Translation, TranslationFailure } from '@/lib/translation';

import { hungryOffer, type Belly } from './belly';
import type { CloudCall, CloudResult } from './cloudGate';
import { askConsent, type ConsentGate } from './consentFlow';

export const KEPT_TRANSLATIONS = 200;
const TEXT_MAX = 4000;

export type KeptTranslation = { id: string; to: Language; text: string; hidden: boolean };

export type TranslationStorage = {
  read(userId: string): unknown;
  write(userId: string, kept: KeptTranslation[] | null): void;
};

export type TranslationConsent = ConsentGate & {
  getSnapshot(): { userId: string | null };
  start(userId: string): void;
  reread(): Promise<{ belly?: Belly | null } | null>;
};

type Tap = { declines: number; forgets: number };

type UserTranslations = { shown: Map<string, Translation>; kept: KeptTranslation[] };

const keyOf = (messageId: string, to: Language) => `${to}:${messageId}`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function validText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text !== '' && [...text].length <= TEXT_MAX ? text : null;
}

export function translatedText(body: unknown): string | null {
  if (!isRecord(body) || body.tool !== 'translate' || !isRecord(body.result)) return null;
  return validText(body.result.text);
}

export function keptTranslations(value: unknown): KeptTranslation[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry): KeptTranslation[] => {
    if (!isRecord(entry) || typeof entry.id !== 'string' || entry.id === '') return [];
    const text = validText(entry.text);
    if (!isLanguage(entry.to) || text === null) return [];
    return [{ id: entry.id, to: entry.to, text, hidden: entry.hidden === true }];
  });
}

function failureOf(result: CloudResult): TranslationFailure | null {
  if (result.kind === 'needsUpdate') return 'needsUpdate';
  if (result.kind === 'unavailable') return 'offline';
  if (result.kind !== 'failed') return null;
  if (result.error === 'hungry' || result.error === 'busy') return result.error;
  return result.status === null ? 'offline' : 'providerError';
}

export function createTranslations(deps: {
  call: CloudCall;
  consent: TranslationConsent;
  storage: TranslationStorage;
}) {
  const users = new Map<string, UserTranslations>();
  const forgets = new Map<string, number>();
  const declines = new Map<string, number>();
  const listeners = new Set<() => void>();
  let queue: Promise<void> = Promise.resolve();

  const countOf = (counts: Map<string, number>, userId: string) => counts.get(userId) ?? 0;
  const emit = () => listeners.forEach((listener) => listener());

  function load(userId: string): UserTranslations {
    let user = users.get(userId);
    if (!user) {
      const kept = keptTranslations(deps.storage.read(userId)).slice(-KEPT_TRANSLATIONS);
      const shown = new Map<string, Translation>(
        kept
          .filter((entry) => !entry.hidden)
          .map((entry) => [keyOf(entry.id, entry.to), { state: 'shown', text: entry.text }]),
      );
      user = { shown, kept };
      users.set(userId, user);
    }
    return user;
  }

  function keep(userId: string, kept: KeptTranslation[]) {
    const user = load(userId);
    user.kept = kept.slice(-KEPT_TRANSLATIONS);
    deps.storage.write(userId, user.kept);
  }

  function place(userId: string, key: string, next: Translation | null) {
    const { shown } = load(userId);
    if (next) shown.set(key, next);
    else shown.delete(key);
    emit();
  }

  async function run(
    userId: string,
    messageId: string,
    text: string,
    to: Language,
    openConsent: () => void,
    tap: Tap,
  ) {
    const key = keyOf(messageId, to);
    const alive = () => countOf(forgets, userId) === tap.forgets;
    const settle = (next: Translation | null) => {
      if (alive()) place(userId, key, next);
    };
    if (!alive()) return;
    if (countOf(declines, userId) !== tap.declines) return settle(null);
    if (deps.consent.getSnapshot().userId !== userId) deps.consent.start(userId);

    const consented = async () => {
      const access = await askConsent(deps.consent, openConsent);
      if (access === 'notGiven') declines.set(userId, countOf(declines, userId) + 1);
      return access;
    };
    const refusal = (access: Exclude<Awaited<ReturnType<typeof consented>>, 'given'>) =>
      access === 'notGiven'
        ? null
        : ({ state: 'failed', reason: access === 'offline' ? 'offline' : 'needsUpdate' } as const);

    let access = await consented();
    if (access !== 'given') return settle(refusal(access));
    const request = { task: 'translate' as const, input: { text, to } };
    let result = await deps.call(request);
    if (result.kind === 'consentRequired') {
      access = await consented();
      if (access !== 'given') return settle(refusal(access));
      result = await deps.call(request);
    }
    if (result.kind === 'consentRequired') return settle(null);
    const failure = failureOf(result);
    if (failure === 'hungry') {
      const status = await deps.consent.reread().catch(() => null);
      const capped = status?.belly ? hungryOffer(status.belly) === 'capped' : false;
      return settle({ state: 'failed', reason: capped ? 'capped' : 'hungry' });
    }
    if (failure) return settle({ state: 'failed', reason: failure });
    const translated = result.kind === 'answered' ? translatedText(result.body) : null;
    if (translated === null) return settle({ state: 'failed', reason: 'unreadable' });
    if (!alive()) return;
    const kept = load(userId).kept.filter((entry) => entry.id !== messageId || entry.to !== to);
    keep(userId, [...kept, { id: messageId, to, text: translated, hidden: false }]);
    place(userId, key, { state: 'shown', text: translated });
  }

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    get(userId: string, messageId: string, to: Language): Translation | null {
      return load(userId).shown.get(keyOf(messageId, to)) ?? null;
    },
    translate(
      userId: string,
      messageId: string,
      text: string,
      to: Language,
      openConsent: () => void,
    ) {
      const source = text.trim();
      if (source === '') return;
      const user = load(userId);
      const key = keyOf(messageId, to);
      const current = user.shown.get(key);
      if (current?.state === 'waiting' || current?.state === 'shown') return;
      const kept = user.kept.find((entry) => entry.id === messageId && entry.to === to);
      if (kept) {
        keep(userId, [...user.kept.filter((entry) => entry !== kept), { ...kept, hidden: false }]);
        place(userId, key, { state: 'shown', text: kept.text });
        return;
      }
      place(userId, key, { state: 'waiting' });
      const tap = { declines: countOf(declines, userId), forgets: countOf(forgets, userId) };
      queue = queue
        .then(() => run(userId, messageId, source, to, openConsent, tap))
        .catch(() => {
          if (countOf(forgets, userId) !== tap.forgets) return;
          if (load(userId).shown.get(key)?.state === 'waiting') {
            place(userId, key, { state: 'failed', reason: 'offline' });
          }
        });
    },
    hide(userId: string, messageId: string, to: Language) {
      const user = load(userId);
      const key = keyOf(messageId, to);
      const current = user.shown.get(key);
      if (!current || current.state === 'waiting') return;
      if (current.state === 'shown') {
        const others = user.kept.filter((entry) => entry.id !== messageId || entry.to !== to);
        keep(userId, [...others, { id: messageId, to, text: current.text, hidden: true }]);
      }
      place(userId, key, null);
    },
    forget(userId: string) {
      forgets.set(userId, countOf(forgets, userId) + 1);
      users.delete(userId);
      deps.storage.write(userId, null);
      emit();
    },
    idle: () => queue,
  };
}

export type Translations = ReturnType<typeof createTranslations>;
