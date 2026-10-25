import { describe, expect, mock, test } from 'bun:test';

import recorded from './bnm-exchange-rate.fixture.json';
import { handleFxRate, parseBnmCny, type FxRateDeps } from './handler';

const post = (token?: string) =>
  new Request('http://localhost/fx-rate', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

function deps(overrides: Partial<FxRateDeps> = {}) {
  return {
    authorized: (token: string) => token === 'service',
    fetchRates: mock(async (): Promise<unknown> => recorded),
    store: mock(async () => {}),
    ...overrides,
  };
}

describe('parseBnmCny', () => {
  test('reads the CNY middle rate from a recorded BNM response', () => {
    expect(parseBnmCny(recorded)).toEqual({
      rateDate: '2026-10-23',
      session: '1700',
      rmPerCny: 0.6122,
    });
  });

  test('divides by the unit BNM quotes', () => {
    const body = {
      meta: { session: '1200' },
      data: [{ currency_code: 'CNY', unit: 100, rate: { date: '2026-10-24', middle_rate: 61.5 } }],
    };
    expect(parseBnmCny(body)?.rmPerCny).toBeCloseTo(0.615, 6);
  });

  test('rejects a response without CNY or with a missing rate', () => {
    expect(parseBnmCny({ meta: { session: '1700' }, data: [] })).toBeNull();
    expect(
      parseBnmCny({
        meta: { session: '1700' },
        data: [{ currency_code: 'CNY', unit: 1, rate: { date: '2026-10-24', middle_rate: null } }],
      }),
    ).toBeNull();
    expect(parseBnmCny('oops')).toBeNull();
  });
});

describe('handleFxRate', () => {
  test('stores the parsed rate', async () => {
    const d = deps();
    const res = await handleFxRate(post('service'), d);
    expect(res.status).toBe(200);
    expect(d.store).toHaveBeenCalledWith({
      rateDate: '2026-10-23',
      session: '1700',
      rmPerCny: 0.6122,
    });
  });

  test('rejects callers without the service key', async () => {
    const d = deps();
    expect((await handleFxRate(post('user-jwt'), d)).status).toBe(401);
    expect((await handleFxRate(post(), d)).status).toBe(401);
    expect(d.store).not.toHaveBeenCalled();
  });

  test('stores nothing when BNM fails or answers an unexpected body', async () => {
    const failing = deps({ fetchRates: mock(async () => Promise.reject(new Error('down'))) });
    expect((await handleFxRate(post('service'), failing)).status).toBe(502);
    const odd = deps({ fetchRates: mock(async (): Promise<unknown> => ({ data: [] })) });
    expect((await handleFxRate(post('service'), odd)).status).toBe(502);
    expect(failing.store).not.toHaveBeenCalled();
    expect(odd.store).not.toHaveBeenCalled();
  });
});
