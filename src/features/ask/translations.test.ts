import { describe, expect, test } from 'bun:test';

import type { Belly } from './belly';
import type { CloudRequest, CloudResult } from './cloudGate';
import type { AskOutcome, PrepareResult } from './consentStore';
import {
  createTranslations,
  KEPT_TRANSLATIONS,
  keptTranslations,
  type KeptTranslation,
} from './translations';

const SAID = 'OK, saya sampai 10 minit lagi';
const translated = (text: string): CloudResult => ({
  kind: 'answered',
  body: { task: 'translate', tool: 'translate', result: { text }, energy: 967, energyFull: 1000 },
});
const BELLY: Belly = {
  energy: 0,
  full: 1000,
  leaves: 0,
  coins: 3,
  feedsLeft: 5,
  nextRefillAt: '2026-11-13T22:00:00.000Z',
};

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((settle) => {
    resolve = settle;
  });
  return { promise, resolve };
}

function setup({
  results = [translated('好，我再过 10 分钟到')],
  access = ['given'],
  outcomes = ['given'],
  belly = BELLY,
  stored = null,
}: {
  results?: (CloudResult | Promise<CloudResult>)[];
  access?: PrepareResult[];
  outcomes?: AskOutcome[];
  belly?: Belly | null;
  stored?: unknown;
} = {}) {
  const requests: CloudRequest[] = [];
  const kept = new Map<string, unknown>(stored === null ? [] : [['u1', stored]]);
  let consentUser: string | null = 'u1';
  const log = { consentOpened: 0, started: [] as string[], rereads: 0 };
  const translations = createTranslations({
    call: async (request) => {
      requests.push(request);
      return (results.length > 1 ? results.shift() : results[0])!;
    },
    consent: {
      getSnapshot: () => ({ userId: consentUser }),
      start(userId) {
        consentUser = userId;
        log.started.push(userId);
      },
      prepare: async () => (access.length > 1 ? access.shift() : access[0])!,
      ask: () => ({
        outcome: Promise.resolve((outcomes.length > 1 ? outcomes.shift() : outcomes[0])!),
      }),
      reread: async () => {
        log.rereads += 1;
        return { belly };
      },
    },
    storage: {
      read: (userId) => kept.get(userId) ?? null,
      write: (userId, value) => void kept.set(userId, value),
    },
  });
  const openConsent = () => {
    log.consentOpened += 1;
  };
  const tap = (messageId = 'm2', text = SAID, userId = 'u1') =>
    translations.translate(userId, messageId, text, 'zh-Hans', openConsent);
  const get = (messageId = 'm2', userId = 'u1') => translations.get(userId, messageId, 'zh-Hans');
  return {
    translations,
    requests,
    kept,
    log,
    tap,
    get,
    setConsentUser: (userId: string | null) => {
      consentUser = userId;
    },
  };
}

describe('translating a chat message', () => {
  test('sends only that message and the app language, then shows the translation under it', async () => {
    const t = setup();
    t.tap();
    expect(t.get()).toEqual({ state: 'waiting' });
    await t.translations.idle();
    expect(t.requests).toEqual([{ task: 'translate', input: { text: SAID, to: 'zh-Hans' } }]);
    expect(t.get()).toEqual({ state: 'shown', text: '好，我再过 10 分钟到' });
    expect(t.log.consentOpened).toBe(0);
  });

  test('a translated message is kept on the device and never charged twice', async () => {
    const t = setup();
    t.tap();
    await t.translations.idle();
    t.translations.hide('u1', 'm2', 'zh-Hans');
    expect(t.get()).toBeNull();
    t.tap();
    await t.translations.idle();
    expect(t.get()).toEqual({ state: 'shown', text: '好，我再过 10 分钟到' });
    expect(t.requests).toHaveLength(1);

    const reopened = setup({ stored: t.kept.get('u1') });
    expect(reopened.get()).toEqual({ state: 'shown', text: '好，我再过 10 分钟到' });
    reopened.tap();
    await reopened.translations.idle();
    expect(reopened.requests).toEqual([]);
  });

  test('a hidden translation stays hidden after a restart', async () => {
    const t = setup();
    t.tap();
    await t.translations.idle();
    t.translations.hide('u1', 'm2', 'zh-Hans');
    expect(setup({ stored: t.kept.get('u1') }).get()).toBeNull();
  });

  test('a second tap while one is under way sends nothing more', async () => {
    const t = setup();
    t.tap();
    t.tap();
    await t.translations.idle();
    expect(t.requests).toHaveLength(1);
  });

  test('translations run one at a time, since the server answers a second call busy', async () => {
    const first = deferred<CloudResult>();
    const t = setup({ results: [first.promise, translated('第二句')] });
    t.tap('m1', 'Satu');
    t.tap('m2', 'Dua');
    await tick();
    expect(t.requests.map((request) => request.input.text)).toEqual(['Satu']);
    expect(t.get('m2')).toEqual({ state: 'waiting' });
    first.resolve(translated('第一句'));
    await t.translations.idle();
    expect(t.requests.map((request) => request.input.text)).toEqual(['Satu', 'Dua']);
    expect(t.get('m1')).toEqual({ state: 'shown', text: '第一句' });
    expect(t.get('m2')).toEqual({ state: 'shown', text: '第二句' });
  });

  test('a different app language is a different translation', async () => {
    const t = setup();
    t.tap();
    await t.translations.idle();
    expect(t.translations.get('u1', 'm2', 'en')).toBeNull();
  });
});

describe('consent before the first translation', () => {
  test('asks first; 同意 sends the message once', async () => {
    const t = setup({ access: ['notGiven'], outcomes: ['given'] });
    t.tap();
    await t.translations.idle();
    expect(t.log.consentOpened).toBe(1);
    expect(t.requests).toHaveLength(1);
    expect(t.get()?.state).toBe('shown');
  });

  test('先不用 sends nothing, leaves no line, and drops the taps queued behind it', async () => {
    const t = setup({ access: ['notGiven'], outcomes: ['declined'] });
    t.tap('m1');
    t.tap('m2');
    await t.translations.idle();
    expect(t.log.consentOpened).toBe(1);
    expect(t.requests).toEqual([]);
    expect(t.get('m1')).toBeNull();
    expect(t.get('m2')).toBeNull();
  });

  test('the next tap after 先不用 asks again', async () => {
    const t = setup({ access: ['notGiven'], outcomes: ['declined'] });
    t.tap();
    await t.translations.idle();
    t.tap();
    await t.translations.idle();
    expect(t.log.consentOpened).toBe(2);
  });

  test('consent withdrawn on another device asks again and sends once more after 同意', async () => {
    const t = setup({
      results: [{ kind: 'consentRequired' }, translated('好')],
      access: ['given', 'notGiven'],
      outcomes: ['given'],
    });
    t.tap();
    await t.translations.idle();
    expect(t.log.consentOpened).toBe(1);
    expect(t.requests).toHaveLength(2);
    expect(t.get()).toEqual({ state: 'shown', text: '好' });
  });

  test('reads consent for this user when 小貘 was never opened', async () => {
    const t = setup();
    t.setConsentUser(null);
    t.tap();
    await t.translations.idle();
    expect(t.log.started).toEqual(['u1']);
  });

  test('an unreadable status sends nothing and says it is offline', async () => {
    const t = setup({ access: ['offline'] });
    t.tap();
    await t.translations.idle();
    expect(t.requests).toEqual([]);
    expect(t.get()).toEqual({ state: 'failed', reason: 'offline' });
  });

  test('terms this build cannot show ask for an update', async () => {
    const t = setup({ access: ['needsUpdate'] });
    t.tap();
    await t.translations.idle();
    expect(t.requests).toEqual([]);
    expect(t.get()).toEqual({ state: 'failed', reason: 'needsUpdate' });
  });
});

describe('when a translation fails', () => {
  const failed = (error: string | null, status: number | null): CloudResult => ({
    kind: 'failed',
    error,
    status,
  });

  test.each([
    ['providerError', failed('provider_error', 502)],
    ['busy', failed('busy', 409)],
    ['offline', failed(null, null)],
    ['unreadable', translated('')],
    ['unreadable', { kind: 'answered', body: { tool: 'answer', result: { text: 'x' } } }],
  ] as const)('%s is told and kept nowhere', async (reason, result) => {
    const t = setup({ results: [result] });
    t.tap();
    await t.translations.idle();
    expect(t.get()).toEqual({ state: 'failed', reason });
    expect(t.kept.get('u1') ?? []).toEqual([]);
  });

  test('a retry is a tap, never automatic', async () => {
    const t = setup({ results: [failed('provider_error', 502), translated('好')] });
    t.tap();
    await t.translations.idle();
    await tick();
    expect(t.requests).toHaveLength(1);
    t.tap();
    await t.translations.idle();
    expect(t.requests).toHaveLength(2);
    expect(t.get()).toEqual({ state: 'shown', text: '好' });
  });

  test('hungry rereads the belly; with feeds left it offers feeding', async () => {
    const t = setup({ results: [failed('hungry', 429)] });
    t.tap();
    await t.translations.idle();
    expect(t.log.rereads).toBe(1);
    expect(t.get()).toEqual({ state: 'failed', reason: 'hungry' });
  });

  test('hungry after five feeds today is capped', async () => {
    const t = setup({ results: [failed('hungry', 429)], belly: { ...BELLY, feedsLeft: 0 } });
    t.tap();
    await t.translations.idle();
    expect(t.get()).toEqual({ state: 'failed', reason: 'capped' });
  });

  test('hiding a failure clears its line', async () => {
    const t = setup({ results: [failed('busy', 409)] });
    t.tap();
    await t.translations.idle();
    t.translations.hide('u1', 'm2', 'zh-Hans');
    expect(t.get()).toBeNull();
  });
});

describe('the device copy', () => {
  test('a reply landing after sign-out writes nothing back', async () => {
    const reply = deferred<CloudResult>();
    const t = setup({ results: [reply.promise] });
    t.tap();
    await tick();
    t.translations.forget('u1');
    reply.resolve(translated('好'));
    await t.translations.idle();
    expect(t.kept.get('u1')).toBeNull();
    expect(t.get()).toBeNull();
  });

  test('forgetting a user clears their kept translations', async () => {
    const t = setup();
    t.tap();
    await t.translations.idle();
    t.translations.forget('u1');
    expect(t.kept.get('u1')).toBeNull();
    expect(t.get()).toBeNull();
  });

  test('keeps only the newest translations', async () => {
    const full: KeptTranslation[] = Array.from({ length: KEPT_TRANSLATIONS }, (_, index) => ({
      id: `old-${index}`,
      to: 'zh-Hans',
      text: `旧 ${index}`,
      hidden: false,
    }));
    const t = setup({ stored: full });
    t.tap();
    await t.translations.idle();
    const kept = t.kept.get('u1') as KeptTranslation[];
    expect(kept).toHaveLength(KEPT_TRANSLATIONS);
    expect(kept[0].id).toBe('old-1');
    expect(kept.at(-1)?.id).toBe('m2');
  });

  test('a damaged copy reads as nothing kept', () => {
    expect(keptTranslations('{')).toEqual([]);
    expect(
      keptTranslations([
        { id: 'm1', to: 'fr', text: 'x' },
        { id: 'm2', to: 'en', text: '' },
        { id: 'm3', to: 'en', text: 'ok' },
      ]),
    ).toEqual([{ id: 'm3', to: 'en', text: 'ok', hidden: false }]);
  });
});
