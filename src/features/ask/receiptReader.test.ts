import { describe, expect, test } from 'bun:test';

import type { ReceiptReadFailure } from '@/lib/drafts/receiptDraft';

import type { Belly } from './belly';
import type { CloudRequest, CloudResult } from './cloudGate';
import type { AskOutcome, PrepareResult } from './consentStore';
import { createReceiptReader } from './receiptReader';

const IMAGE = { mediaType: 'image/jpeg' as const, data: '/9j/' };
const read = (total: string | null, currency: string | null = 'MYR'): CloudResult => ({
  kind: 'answered',
  body: { task: 'read_receipt', tool: 'draft_split', result: { total, currency }, energy: 857 },
});
const BELLY: Belly = {
  energy: 0,
  full: 1000,
  leaves: 0,
  coins: 0,
  feedsLeft: 0,
  nextRefillAt: '2026-11-25T22:00:00.000Z',
};

function setup({
  results = [read('74.00')],
  access = ['given'],
  outcomes = ['given'],
  image = IMAGE,
}: {
  results?: CloudResult[];
  access?: PrepareResult[];
  outcomes?: AskOutcome[];
  image?: typeof IMAGE | null;
} = {}) {
  const requests: CloudRequest[] = [];
  const log = { consentOpened: 0, encoded: [] as string[] };
  const reader = createReceiptReader({
    call: async (request) => {
      requests.push(request);
      return (results.length > 1 ? results.shift() : results[0])!;
    },
    consent: {
      getSnapshot: () => ({ userId: 'u1' }),
      start: () => {},
      prepare: async () => (access.length > 1 ? access.shift() : access[0])!,
      ask: () => ({
        outcome: Promise.resolve((outcomes.length > 1 ? outcomes.shift() : outcomes[0])!),
      }),
      reread: async () => ({ belly: BELLY }),
    },
    encode: async (uri) => {
      log.encoded.push(uri);
      return image;
    },
  });
  const run = () =>
    reader('u1', 'file:///receipt.jpg', 'MYR', () => {
      log.consentOpened += 1;
    });
  return { run, requests, log };
}

describe('reading a ride receipt', () => {
  test('a read receipt comes back as the ride currency total; only the image is sent', async () => {
    const { run, requests } = setup();
    expect(await run()).toEqual({ kind: 'read', total: { minor: 7400, currency: 'MYR' } });
    expect(requests).toEqual([{ task: 'read_receipt', input: { text: '', image: IMAGE } }]);
  });

  test('a total in another currency is not a reading for this ride', async () => {
    const { run } = setup({ results: [read('120', 'CNY')] });
    expect(await run()).toEqual({
      kind: 'otherCurrency',
      total: { minor: 12000, currency: 'CNY' },
    });
  });

  test('nothing read and a malformed reply differ', async () => {
    expect(await setup({ results: [read(null, null)] }).run()).toEqual({ kind: 'unreadable' });
    expect(await setup({ results: [read('18.405')] }).run()).toEqual({
      kind: 'failed',
      reason: 'providerError',
    });
  });

  test('without consent the screen opens; declining sends nothing', async () => {
    const { run, requests, log } = setup({ access: ['notGiven'], outcomes: ['declined'] });
    expect(await run()).toEqual({ kind: 'declined' });
    expect(log.consentOpened).toBe(1);
    expect(log.encoded).toEqual([]);
    expect(requests).toEqual([]);
  });

  test('agreeing on the consent screen goes on to read', async () => {
    const { run, requests, log } = setup({ access: ['notGiven'], outcomes: ['given'] });
    expect((await run()).kind).toBe('read');
    expect(log.consentOpened).toBe(1);
    expect(requests).toHaveLength(1);
  });

  test('consent withdrawn elsewhere asks again and reads once', async () => {
    const { run, requests, log } = setup({
      results: [{ kind: 'consentRequired' }, read('74.00')],
      access: ['given', 'notGiven'],
    });
    expect((await run()).kind).toBe('read');
    expect(log.consentOpened).toBe(1);
    expect(requests).toHaveLength(2);
  });

  test.each<[string, CloudResult, ReceiptReadFailure]>([
    ['hungry with nothing left today', { kind: 'failed', error: 'hungry', status: 429 }, 'capped'],
    ['busy', { kind: 'failed', error: 'busy', status: 409 }, 'busy'],
    ['offline', { kind: 'failed', error: null, status: null }, 'offline'],
    ['a provider error', { kind: 'failed', error: 'provider_error', status: 502 }, 'providerError'],
    ['an old app', { kind: 'needsUpdate' }, 'needsUpdate'],
  ])('%s is a failure the sheet can name', async (_name, result, reason) => {
    expect(await setup({ results: [result] }).run()).toEqual({ kind: 'failed', reason });
  });

  test('an image that cannot be prepared is never sent', async () => {
    const { run, requests } = setup({ image: null });
    expect(await run()).toEqual({ kind: 'failed', reason: 'image' });
    expect(requests).toEqual([]);
  });
});
