import { describe, expect, test } from 'bun:test';

import {
  createFixturePaymentService,
  FIXTURE_PAYMENT_IDS,
  FIXTURE_USER_ID,
} from './fixturePaymentService';
import { answeredSheet, failedSheet, type SheetState } from './sheetLoad';

async function readySheet(): Promise<SheetState> {
  const service = createFixturePaymentService({
    variant: 'demo',
    feed: undefined,
    mix: 'all',
    rate: true,
  });
  const payment = await service.get(FIXTURE_USER_ID, FIXTURE_PAYMENT_IDS.owe);
  if (!payment) throw new Error('fixture payment missing');
  const detail = await service.detail(payment.id);
  return answeredSheet({ status: 'ready', payment, methods: [], detail }, 1_000);
}

describe('pay sheet loads', () => {
  test('an answer records when it was loaded', async () => {
    const sheet = await readySheet();
    expect(sheet).toMatchObject({ status: 'ready', loadedAt: 1_000, refreshFailed: false });
  });

  test('a failed refetch after a signal keeps the data but marks it stale', async () => {
    const stale = failedSheet(await readySheet());
    expect(stale).toMatchObject({ status: 'ready', loadedAt: 1_000, refreshFailed: true });
  });

  test('the next answer clears the stale mark', async () => {
    const stale = failedSheet(await readySheet());
    if (stale.status !== 'ready') throw new Error('expected ready');
    const { payment, methods, detail } = stale;
    expect(answeredSheet({ status: 'ready', payment, methods, detail }, 2_000)).toMatchObject({
      loadedAt: 2_000,
      refreshFailed: false,
    });
  });

  test('a failed first load is a failure, never an empty sheet', () => {
    expect(failedSheet({ status: 'loading' })).toEqual({ status: 'failed' });
    expect(answeredSheet({ status: 'missing' }, 1)).toEqual({ status: 'missing' });
  });
});
