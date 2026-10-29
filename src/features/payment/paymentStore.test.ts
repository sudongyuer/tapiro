import { describe, expect, test } from 'bun:test';
import { createInstance } from 'i18next';

import { resources } from '@/lib/i18n/resources';
import { createLiveItems } from '@/lib/liveItems';

import {
  createFixturePaymentService,
  FIXTURE_PAYMENT_IDS,
  FIXTURE_USER_ID,
  type FixturePaymentOptions,
} from './fixturePaymentService';
import { accessoryItems } from './livePayments';
import { createPaymentStore } from './paymentStore';

const OPTIONS: FixturePaymentOptions = {
  variant: 'demo',
  feed: undefined,
  mix: 'all',
  rate: true,
};

const i18n = createInstance();
i18n.init({ resources, lng: 'zh-Hans', initAsync: false, interpolation: { escapeValue: false } });
const t = i18n.t;

async function ready(options: Partial<FixturePaymentOptions> = {}) {
  const store = createPaymentStore(createFixturePaymentService({ ...OPTIONS, ...options }));
  await store.ensureLoaded(FIXTURE_USER_ID);
  return store;
}

const payments = (store: Awaited<ReturnType<typeof ready>>) => {
  const state = store.getSnapshot();
  return state.status === 'ready' ? state.payments : [];
};

function flaky(options: Partial<FixturePaymentOptions> = {}) {
  const service = createFixturePaymentService({ ...OPTIONS, ...options });
  let failing = false;
  const store = createPaymentStore({
    ...service,
    list: (userId) => (failing ? Promise.reject(new Error('offline')) : service.list(userId)),
  });
  return { store, fail: (next: boolean) => (failing = next) };
}

describe('payment store load states', () => {
  test('a failed first load is failed, never an empty ready list', async () => {
    const { store, fail } = flaky();
    fail(true);
    await store.ensureLoaded(FIXTURE_USER_ID);
    expect(store.getSnapshot()).toMatchObject({ status: 'failed', payments: [] });
  });

  test('a failed refresh marks the list stale instead of keeping it live', async () => {
    const { store, fail } = flaky();
    await store.ensureLoaded(FIXTURE_USER_ID);
    fail(true);
    await store.reload(FIXTURE_USER_ID);
    const state = store.getSnapshot();
    expect(state.status).toBe('stale');
    expect(state.status !== 'idle' && state.payments).toHaveLength(2);
    fail(false);
    await store.reload(FIXTURE_USER_ID);
    expect(store.getSnapshot().status).toBe('ready');
  });

  test('signing out clears the list', async () => {
    const store = await ready();
    store.clear();
    expect(store.getSnapshot()).toEqual({ status: 'idle' });
  });
});

describe('payment store', () => {
  test('lists the unsettled payments the feed selects', async () => {
    expect(payments(await ready()).map((p) => p.id)).toEqual([
      FIXTURE_PAYMENT_IDS.owe,
      FIXTURE_PAYMENT_IDS.owed,
    ]);
    expect(payments(await ready({ feed: 'oweMoney,rideSoon' })).map((p) => p.id)).toEqual([
      FIXTURE_PAYMENT_IDS.owe,
    ]);
    expect(payments(await ready({ feed: 'none' }))).toEqual([]);
  });

  test('a failed action reports failure and keeps the list', async () => {
    const store = await ready();
    const result = await store.run(FIXTURE_USER_ID, () =>
      store.service.undo(FIXTURE_PAYMENT_IDS.owe),
    );
    expect(result.ok).toBe(false);
    expect(payments(store)).toHaveLength(2);
  });

  test('settling removes the payment from the list; only the first settle is first', async () => {
    const store = await ready();
    const first = await store.run(FIXTURE_USER_ID, () =>
      store.service.confirm(FIXTURE_PAYMENT_IDS.owed),
    );
    expect(first).toEqual({ ok: true, value: { firstSettled: true, stickerCount: 1 } });
    expect(payments(store).map((p) => p.id)).toEqual([FIXTURE_PAYMENT_IDS.owe]);
    const later = await store.run(FIXTURE_USER_ID, () =>
      store.service.confirm(FIXTURE_PAYMENT_IDS.owedCash),
    );
    expect(later).toEqual({ ok: true, value: { firstSettled: false, stickerCount: 2 } });
  });

  test('marking paid then undoing returns the payment to due', async () => {
    const store = await ready();
    const methods = await store.service.methodsOf('fixture-payee');
    const phone = methods.find((method) => method.type === 'duitnow_id');
    const cash = methods.find((method) => method.type === 'cash');
    expect(
      (
        await store.run(FIXTURE_USER_ID, () =>
          store.service.markPaid(FIXTURE_PAYMENT_IDS.owe, cash!.id, null),
        )
      ).ok,
    ).toBe(false);
    await store.run(FIXTURE_USER_ID, () =>
      store.service.markPaid(FIXTURE_PAYMENT_IDS.owe, phone!.id, null),
    );
    expect(payments(store)[0]).toMatchObject({ state: 'marked_paid', methodType: 'duitnow_id' });
    await store.run(FIXTURE_USER_ID, () => store.service.undo(FIXTURE_PAYMENT_IDS.owe));
    expect(payments(store)[0]).toMatchObject({ state: 'due', methodType: null });
  });

  test('a yuan payment paid by DuitNow at the locked rate records the ringgit paid', async () => {
    const store = await ready({ currency: 'CNY' });
    const phone = (await store.service.methodsOf('fixture-payee')).find(
      (method) => method.type === 'duitnow_id',
    );
    await store.run(FIXTURE_USER_ID, () =>
      store.service.markPaid(FIXTURE_PAYMENT_IDS.owe, phone!.id, null),
    );
    expect(payments(store)[0]).toMatchObject({
      amount: { minor: 5000, currency: 'CNY' },
      paid: { minor: 3061, currency: 'MYR' },
    });
  });

  test('without a locked rate a conversion fails as no rate and the payment stays due', async () => {
    const store = await ready({ currency: 'CNY', rate: false, mix: 'duitnow' });
    const detail = await store.service.detail(FIXTURE_PAYMENT_IDS.owe);
    expect(detail.rate).toBeNull();
    expect(detail.methods.map((method) => method.amount)).toEqual([null]);
    const marked = await store.run(FIXTURE_USER_ID, () =>
      store.service.markPaid(FIXTURE_PAYMENT_IDS.owe, detail.methods[0].methodId, null),
    );
    expect(marked.ok).toBe(false);
    expect(payments(store)[0]).toMatchObject({ state: 'due', paid: null });
  });
});

const ringgit = (minor: number) => ({ minor, currency: 'MYR' as const });

describe('live payments', () => {
  test('a due payment is money I owe; a marked-paid one is owed to me, waiting for my confirmation', async () => {
    const items = accessoryItems(payments(await ready()), t);
    expect(items.map(({ kind, title, sub, amount }) => ({ kind, title, sub, amount }))).toEqual([
      { kind: 'oweMoney', title: '付给阿杰', sub: '帮取快递', amount: ringgit(1500) },
      {
        kind: 'owedToYou',
        title: '小林说已付你',
        sub: '帮带一杯咖啡 · 等你确认',
        amount: ringgit(800),
      },
    ]);
    expect(items[0].payment).toEqual({
      id: FIXTURE_PAYMENT_IDS.owe,
      counterpart: '阿杰',
      note: '帮取快递',
    });
  });

  test('after 我已付款 the payer sees a quiet waiting item until the payee says 还没收到', async () => {
    const store = await ready({ feed: 'oweMoney' });
    const [owe] = payments(store);
    const [waiting] = accessoryItems([{ ...owe, state: 'marked_paid' }], t);
    expect(waiting).toMatchObject({ kind: 'waitingConfirm', title: '等阿杰确认', sub: '帮取快递' });
    const [nudged] = accessoryItems([{ ...owe, state: 'marked_paid', nudgedAt: owe.createdAt }], t);
    expect(nudged).toMatchObject({ kind: 'oweMoney', sub: '阿杰说还没收到 · 帮取快递' });
  });

  test('the store feeds the accessory through the live-item contract', async () => {
    const live = createLiveItems();
    const store = await ready();
    live.setSource('payments', accessoryItems(payments(store), t));
    await store.run(FIXTURE_USER_ID, () => store.service.confirm(FIXTURE_PAYMENT_IDS.owed));
    live.setSource('payments', accessoryItems(payments(store), t));
    expect(live.getSnapshot().accessory.map((item) => item.kind)).toEqual(['oweMoney']);
  });
});
