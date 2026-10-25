import { describe, expect, mock, test } from 'bun:test';

import {
  handleAccountDelete,
  toUnsettledPayments,
  type AccountDeleteDeps,
  type UnsettledPayment,
} from './handler';

const USER = '00000000-0000-4000-8000-00000000000a';

function deps(overrides: Partial<AccountDeleteDeps> = {}) {
  return {
    userIdFromToken: mock(async (token: string) => (token === 'valid' ? USER : null)),
    findUnsettledPayments: mock(async (): Promise<UnsettledPayment[]> => []),
    deleteUser: mock(async () => {}),
    ...overrides,
  };
}

function post(token?: string) {
  return new Request('http://localhost/account-delete', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

describe('handleAccountDelete', () => {
  test('deletes the caller', async () => {
    const d = deps();
    const res = await handleAccountDelete(post('valid'), d);
    expect(res.status).toBe(200);
    expect(d.deleteUser).toHaveBeenCalledWith(USER);
  });

  test('rejects a request without a user token', async () => {
    const d = deps();
    expect((await handleAccountDelete(post(), d)).status).toBe(401);
    expect((await handleAccountDelete(post('anon'), d)).status).toBe(401);
    expect(d.deleteUser).not.toHaveBeenCalled();
  });

  test('blocks deletion while a payment is unsettled and names it', async () => {
    const payment = {
      id: 'p1',
      title: 'Ride to KLIA',
      counterpartName: 'Aisyah',
      amountSen: 2500,
      direction: 'owe' as const,
    };
    const d = deps({ findUnsettledPayments: mock(async () => [payment]) });
    const res = await handleAccountDelete(post('valid'), d);
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: 'unsettled_payments', payments: [payment] });
    expect(d.deleteUser).not.toHaveBeenCalled();
  });

  test('rejects methods other than POST', async () => {
    const res = await handleAccountDelete(
      new Request('http://localhost/account-delete', { method: 'GET' }),
      deps(),
    );
    expect(res.status).toBe(405);
  });

  test('reports a failed admin delete as a server error', async () => {
    const d = deps({
      deleteUser: mock(async () => {
        throw new Error('admin api down');
      }),
    });
    expect((await handleAccountDelete(post('valid'), d)).status).toBe(500);
  });
});

describe('toUnsettledPayments', () => {
  test('names the counterpart and the direction from the deleting user', () => {
    const rows = [
      { id: 'p1', title: '帮取快递', amount_sen: 1500, payer_id: USER, payee_id: 'helper' },
      { id: 'p2', title: 'KLIA', amount_sen: 2500, payer_id: 'rider', payee_id: USER },
      { id: 'p3', title: 'Gone', amount_sen: 100, payer_id: null, payee_id: USER },
    ];
    expect(toUnsettledPayments(USER, rows, { helper: '阿杰', rider: 'Aisyah' })).toEqual([
      { id: 'p1', title: '帮取快递', counterpartName: '阿杰', amountSen: 1500, direction: 'owe' },
      { id: 'p2', title: 'KLIA', counterpartName: 'Aisyah', amountSen: 2500, direction: 'owed' },
      { id: 'p3', title: 'Gone', counterpartName: '', amountSen: 100, direction: 'owed' },
    ]);
  });
});

describe('a failed unsettled check', () => {
  test('deletes nothing and reports a server error', async () => {
    const d = deps({ findUnsettledPayments: mock(async () => Promise.reject(new Error('db'))) });
    const res = await handleAccountDelete(post('valid'), d);
    expect(res.status).toBe(500);
    expect(d.deleteUser).not.toHaveBeenCalled();
  });
});
