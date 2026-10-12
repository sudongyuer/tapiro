import { describe, expect, mock, test } from 'bun:test';

import { handleAccountDelete, type AccountDeleteDeps, type UnsettledPayment } from './handler';

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
