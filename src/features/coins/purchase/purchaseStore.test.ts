import { describe, expect, test } from 'bun:test';

import type { VerifyAnswer } from './forward';
import { createFixtureStore, FIXTURE_PACKS, type StoreMode } from './fixtureStore';
import { mergePacks, toServerPacks } from './packs';
import { createPurchaseStore } from './purchaseStore';
import type { StoreBoundary, StoreTransaction } from './types';

const USER = '0A1B2C3D-0000-4000-8000-000000000001'.toLowerCase();
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function harness({
  mode = 'ok' as StoreMode,
  answers = [] as VerifyAnswer[],
  store: override,
}: { mode?: StoreMode; answers?: VerifyAnswer[]; store?: Partial<StoreBoundary> } = {}) {
  const calls: string[] = [];
  const base = createFixtureStore({ mode, userId: () => USER, approveAfterMs: 5 });
  const store: StoreBoundary = {
    ...base,
    finish: async (id) => {
      calls.push(`finish ${id}`);
      return base.finish(id);
    },
    ...override,
  };
  let changed = 0;
  const purchases = createPurchaseStore({
    store,
    packs: async () => [
      { productId: 'app.tapiro.coins.11', coins: 11 },
      { productId: 'app.tapiro.coins.5', coins: 5 },
    ],
    verify: async (jws) => {
      calls.push(`verify ${jws}`);
      return (
        answers.shift() ?? {
          ok: true,
          status: 'credited',
          balance: 20,
          coins: jws.includes('.11.') ? 11 : 5,
        }
      );
    },
    onCoinsChanged: () => {
      changed += 1;
    },
  });
  return { purchases, calls, changed: () => changed, store };
}

async function started(h: ReturnType<typeof harness>) {
  await h.purchases.start(USER);
  await h.purchases.loadPacks();
  return h;
}

describe('purchase store', () => {
  test('a purchase is shown as done only after the server credits it, and finished after that', async () => {
    const h = await started(harness());
    const buying = h.purchases.buy('app.tapiro.coins.11');
    expect(h.purchases.getSnapshot().purchase.phase).toBe('buying');
    await buying;
    expect(h.purchases.getSnapshot().purchase).toEqual({
      phase: 'succeeded',
      productId: 'app.tapiro.coins.11',
      coins: 11,
    });
    expect(h.calls[0]).toStartWith('verify ');
    expect(h.calls[1]).toStartWith('finish ');
    expect(h.changed()).toBe(1);
  });

  for (const answer of [
    { ok: false, httpStatus: 422, error: 'unverified' },
    { ok: false, httpStatus: 422, error: 'unknown_product' },
    { ok: false, httpStatus: 503, error: 'verification_unavailable' },
    { ok: false, httpStatus: null, error: 'network' },
  ] as const) {
    test(`a ${answer.httpStatus ?? 'missing'} ${answer.error} answer shows 购买处理中 and never finishes`, async () => {
      const h = await started(harness({ answers: [answer] }));
      await h.purchases.buy('app.tapiro.coins.5');
      const state = h.purchases.getSnapshot();
      expect(state.purchase.phase).toBe('processing');
      expect(state.kept).toHaveLength(1);
      expect(h.calls.some((call) => call.startsWith('finish'))).toBe(false);
      expect(h.changed()).toBe(0);
    });
  }

  test('a kept purchase is sent again only when the user asks, then credited', async () => {
    const h = await started(
      harness({ answers: [{ ok: false, httpStatus: 503, error: 'verification_unavailable' }] }),
    );
    await h.purchases.buy('app.tapiro.coins.5');
    await flush();
    expect(h.calls.filter((call) => call.startsWith('verify'))).toHaveLength(1);
    await h.purchases.recheck();
    const state = h.purchases.getSnapshot();
    expect(state.purchase).toEqual({
      phase: 'succeeded',
      productId: 'app.tapiro.coins.5',
      coins: 5,
    });
    expect(state.kept).toEqual([]);
    expect(h.calls.filter((call) => call.startsWith('finish'))).toHaveLength(1);
  });

  test('Ask to Buy waits as pending and is credited when the approval arrives', async () => {
    const h = await started(harness({ mode: 'approved' }));
    await h.purchases.buy('app.tapiro.coins.11');
    expect(h.purchases.getSnapshot().purchase.phase).toBe('pending');
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(h.purchases.getSnapshot().purchase).toEqual({
      phase: 'succeeded',
      productId: 'app.tapiro.coins.11',
      coins: 11,
    });
  });

  test('a cancelled purchase sends nothing and returns to the list', async () => {
    const h = await started(harness({ mode: 'cancelled' }));
    await h.purchases.buy('app.tapiro.coins.5');
    expect(h.purchases.getSnapshot().purchase.phase).toBe('idle');
    expect(h.calls).toEqual([]);
  });

  for (const [mode, reason] of [
    ['failed', 'failed'],
    ['notAllowed', 'notAllowed'],
  ] as const) {
    test(`a ${mode} purchase shows the failure and sends nothing`, async () => {
      const h = await started(harness({ mode }));
      await h.purchases.buy('app.tapiro.coins.5');
      expect(h.purchases.getSnapshot().purchase).toEqual({
        phase: 'failed',
        productId: 'app.tapiro.coins.5',
        reason,
      });
      expect(h.calls).toEqual([]);
    });
  }

  test('a refund answered before the credit is shown as refunded, not done', async () => {
    const h = await started(
      harness({ answers: [{ ok: true, status: 'revoked', balance: 0, coins: 5 }] }),
    );
    await h.purchases.buy('app.tapiro.coins.5');
    expect(h.purchases.getSnapshot().purchase.phase).toBe('refunded');
  });

  test('a second tap while buying starts no second purchase', async () => {
    const h = await started(harness());
    const first = h.purchases.buy('app.tapiro.coins.5');
    await h.purchases.buy('app.tapiro.coins.11');
    await first;
    expect(h.calls.filter((call) => call.startsWith('verify'))).toHaveLength(1);
  });

  test('on start, unfinished transactions of this user are forwarded; another account’s and untokened ones are left alone', async () => {
    const tx = (id: string, token: string): StoreTransaction => ({
      source: 'unfinished',
      transactionId: id,
      originalTransactionId: id,
      productId: 'app.tapiro.coins.5',
      jws: `jws-${id}`,
      environment: 'Xcode',
      appAccountToken: token,
      revoked: false,
      verified: true,
    });
    const h = harness({
      store: {
        unfinished: async () => [
          tx('mine', USER.toUpperCase().toLowerCase()),
          tx('theirs', 'other-user'),
          tx('untokened', ''),
        ],
      },
    });
    await h.purchases.start(USER);
    expect(h.calls).toEqual(['verify jws-mine', 'finish mine']);
    expect(h.changed()).toBe(1);
  });

  test('a refunded transaction from history that the server rejects is not shown as 购买处理中', async () => {
    const h = harness({
      answers: [{ ok: false, httpStatus: 503, error: 'verification_unavailable' }],
      store: {
        revoked: async () => [
          {
            source: 'history',
            transactionId: 'r1',
            originalTransactionId: 'r1',
            productId: 'app.tapiro.coins.5',
            jws: 'jws-r1',
            environment: 'Sandbox',
            appAccountToken: USER,
            revoked: true,
            verified: true,
          },
        ],
      },
    });
    await h.purchases.start(USER);
    expect(h.calls).toEqual(['verify jws-r1']);
    expect(h.purchases.getSnapshot().kept).toEqual([]);
  });

  test('signing out stops the listener and drops a late answer', async () => {
    let removed = 0;
    let deliver: ((tx: StoreTransaction) => void) | null = null;
    const h = harness({
      store: {
        listen: (cb) => {
          deliver = cb;
          return { remove: () => (removed += 1) };
        },
      },
    });
    await started(h);
    const buying = h.purchases.buy('app.tapiro.coins.5');
    h.purchases.clear();
    await buying;
    expect(removed).toBe(1);
    expect(h.purchases.getSnapshot().userId).toBeNull();
    expect(h.purchases.getSnapshot().purchase.phase).toBe('idle');
    expect(deliver).not.toBeNull();
  });
});

describe('purchase status settles only for its own transaction', () => {
  test('with two kept purchases of one pack, 再确认一次 settles the newer one by its own transaction', async () => {
    const reject = { ok: false, httpStatus: 503, error: 'verification_unavailable' } as const;
    const h = await started(harness({ answers: [reject, reject] }));
    await h.purchases.buy('app.tapiro.coins.5');
    const older = h.purchases.getSnapshot().kept[0];
    h.purchases.dismiss();
    await h.purchases.buy('app.tapiro.coins.5');
    const state = h.purchases.getSnapshot();
    expect(state.purchase.phase).toBe('processing');
    expect(state.kept).toHaveLength(2);
    expect(state.kept[0]).toBe(older);
    await h.purchases.recheck();
    expect(h.purchases.getSnapshot().purchase.phase).toBe('succeeded');
    expect(h.purchases.getSnapshot().kept).toEqual([]);
  });

  test('a credit for another kept transaction leaves the processing phase', async () => {
    const reject = { ok: false, httpStatus: 503, error: 'verification_unavailable' } as const;
    let deliver: ((tx: StoreTransaction) => void) | null = null;
    const h = harness({
      answers: [reject],
      store: {
        listen: (cb) => {
          deliver = cb;
          return { remove: () => undefined };
        },
      },
    });
    await started(h);
    await h.purchases.buy('app.tapiro.coins.5');
    expect(h.purchases.getSnapshot().purchase.phase).toBe('processing');
    deliver!({
      source: 'updates',
      transactionId: 'old-5',
      originalTransactionId: 'old-5',
      productId: 'app.tapiro.coins.5',
      jws: 'jws.5.old',
      environment: 'Xcode',
      appAccountToken: USER,
      revoked: false,
      verified: true,
    });
    await flush();
    await flush();
    expect(h.purchases.getSnapshot().purchase.phase).toBe('processing');
    expect(h.purchases.getSnapshot().kept).toHaveLength(1);
  });

  test('a wrong_account answer is not shown as 购买处理中', async () => {
    const h = await started(
      harness({ answers: [{ ok: false, httpStatus: 403, error: 'wrong_account' }] }),
    );
    await h.purchases.buy('app.tapiro.coins.5');
    expect(h.purchases.getSnapshot().kept).toEqual([]);
    expect(h.calls.some((call) => call.startsWith('finish'))).toBe(false);
  });

  test('a credit without a known coin count shows no number', async () => {
    const h = await started(
      harness({ answers: [{ ok: true, status: 'credited', balance: 1, coins: null }] }),
    );
    await h.purchases.buy('app.tapiro.coins.35');
    expect(h.purchases.getSnapshot().purchase).toEqual({
      phase: 'succeeded',
      productId: 'app.tapiro.coins.35',
      coins: null,
    });
  });

  test('reopening clears a pending Ask to Buy that never came back', async () => {
    const h = await started(harness({ mode: 'pending' }));
    await h.purchases.buy('app.tapiro.coins.5');
    expect(h.purchases.getSnapshot().purchase.phase).toBe('pending');
    h.purchases.dismiss();
    expect(h.purchases.getSnapshot().purchase.phase).toBe('idle');
  });

  test('packs read before the store started fail instead of spinning', async () => {
    const h = harness();
    await h.purchases.loadPacks();
    expect(h.purchases.getSnapshot().packs.status).toBe('failed');
  });
});

describe('packs', () => {
  test('coins come from the server table and prices from StoreKit, in the server’s order', async () => {
    const h = await started(harness());
    const packs = h.purchases.getSnapshot().packs;
    expect(packs.status).toBe('ready');
    expect(packs.status === 'idle' ? null : packs.data).toEqual([
      { productId: 'app.tapiro.coins.11', coins: 11, price: 'RM 9.90' },
      { productId: 'app.tapiro.coins.5', coins: 5, price: 'RM 4.90' },
    ]);
  });

  test('a pack StoreKit does not know is left out', () => {
    expect(
      mergePacks(FIXTURE_PACKS, [
        {
          id: 'app.tapiro.coins.5',
          displayName: '',
          displayPrice: 'RM 4.90',
          price: 4.9,
          currencyCode: 'MYR',
        },
      ]),
    ).toEqual([{ productId: 'app.tapiro.coins.5', coins: 5, price: 'RM 4.90' }]);
  });

  test('a StoreKit failure reads as failed, not as an empty shop', async () => {
    const h = await started(harness({ mode: 'productsFailed' }));
    expect(h.purchases.getSnapshot().packs.status).toBe('failed');
  });

  test('no products from StoreKit reads as an empty list', async () => {
    const h = await started(harness({ mode: 'noProducts' }));
    const packs = h.purchases.getSnapshot().packs;
    expect(packs.status === 'idle' ? null : packs.data).toEqual([]);
  });

  test('a malformed server pack is refused', () => {
    expect(() => toServerPacks([{ productId: 'x', coins: 0 }])).toThrow();
    expect(() => toServerPacks({})).toThrow();
    expect(toServerPacks([{ productId: 'x', coins: 3 }])).toEqual([{ productId: 'x', coins: 3 }]);
  });
});
