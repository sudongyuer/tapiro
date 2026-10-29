import { describe, expect, mock, test } from 'bun:test';

import {
  handleAccountDelete,
  toActiveBounties,
  toUnsettledPayments,
  type AccountDeleteDeps,
  type ActiveBounty,
  type UnsettledPayment,
} from './handler';

const USER = '00000000-0000-4000-8000-00000000000a';

function deps(overrides: Partial<AccountDeleteDeps> = {}) {
  return {
    userIdFromToken: mock(async (token: string) => (token === 'valid' ? USER : null)),
    findUnsettledPayments: mock(async (): Promise<UnsettledPayment[]> => []),
    findActiveBounties: mock(async (): Promise<ActiveBounty[]> => []),
    deleteUser: mock(async () => {}),
    ...overrides,
  };
}

const payment: UnsettledPayment = {
  id: 'p1',
  title: 'Ride to KLIA',
  counterpartName: 'Aisyah',
  amountMinor: 2500,
  currency: 'MYR',
  direction: 'owe',
};

const bounty: ActiveBounty = {
  id: 'b1',
  title: '帮取快递',
  counterpartName: '阿杰',
  amountMinor: 500,
  currency: 'MYR',
  role: 'poster',
};

function post(token?: string) {
  return new Request('http://localhost/account-delete', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

describe('handleAccountDelete', () => {
  test('deletes the caller when no payment is unsettled and no bounty is active', async () => {
    const d = deps();
    const res = await handleAccountDelete(post('valid'), d);
    expect(res.status).toBe(200);
    expect(d.findActiveBounties).toHaveBeenCalledWith(USER);
    expect(d.deleteUser).toHaveBeenCalledWith(USER);
  });

  test('rejects a request without a user token', async () => {
    const d = deps();
    expect((await handleAccountDelete(post(), d)).status).toBe(401);
    expect((await handleAccountDelete(post('anon'), d)).status).toBe(401);
    expect(d.deleteUser).not.toHaveBeenCalled();
  });

  test('blocks deletion while a payment is unsettled and names it', async () => {
    const d = deps({ findUnsettledPayments: mock(async () => [payment]) });
    const res = await handleAccountDelete(post('valid'), d);
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      error: 'unsettled_payments',
      payments: [payment],
      bounties: [],
    });
    expect(d.deleteUser).not.toHaveBeenCalled();
  });

  test('blocks deletion while a bounty is active and names it', async () => {
    const d = deps({ findActiveBounties: mock(async () => [bounty]) });
    const res = await handleAccountDelete(post('valid'), d);
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      error: 'unsettled_payments',
      payments: [],
      bounties: [bounty],
    });
    expect(d.deleteUser).not.toHaveBeenCalled();
  });

  test('lists unsettled payments and active bounties together', async () => {
    const d = deps({
      findUnsettledPayments: mock(async () => [payment]),
      findActiveBounties: mock(async () => [bounty]),
    });
    const res = await handleAccountDelete(post('valid'), d);
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      error: 'unsettled_payments',
      payments: [payment],
      bounties: [bounty],
    });
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
      {
        id: 'p1',
        title: '帮取快递',
        amount_minor: 1500,
        currency: 'MYR',
        payer_id: USER,
        payee_id: 'helper',
      },
      {
        id: 'p2',
        title: 'KLIA',
        amount_minor: 2500,
        currency: 'MYR',
        payer_id: 'rider',
        payee_id: USER,
      },
      {
        id: 'p3',
        title: 'Gone',
        amount_minor: 100,
        currency: 'MYR',
        payer_id: null,
        payee_id: USER,
      },
    ];
    expect(toUnsettledPayments(USER, rows, { helper: '阿杰', rider: 'Aisyah' })).toEqual([
      {
        id: 'p1',
        title: '帮取快递',
        counterpartName: '阿杰',
        amountMinor: 1500,
        currency: 'MYR',
        direction: 'owe',
      },
      {
        id: 'p2',
        title: 'KLIA',
        counterpartName: 'Aisyah',
        amountMinor: 2500,
        currency: 'MYR',
        direction: 'owed',
      },
      {
        id: 'p3',
        title: 'Gone',
        counterpartName: '',
        amountMinor: 100,
        currency: 'MYR',
        direction: 'owed',
      },
    ]);
  });
});

describe('toActiveBounties', () => {
  test('names the counterpart and keeps the role and reward', () => {
    const rows = [
      {
        id: 'b1',
        title: '帮取快递',
        reward_minor: 500,
        reward_currency: 'MYR',
        role: 'poster' as const,
        counterpart_id: 'helper',
      },
      {
        id: 'b2',
        title: '代买早餐',
        reward_minor: 800,
        reward_currency: 'MYR',
        role: 'helper' as const,
        counterpart_id: null,
      },
    ];
    expect(toActiveBounties(rows, { helper: '阿杰' })).toEqual([
      {
        id: 'b1',
        title: '帮取快递',
        counterpartName: '阿杰',
        amountMinor: 500,
        currency: 'MYR',
        role: 'poster',
      },
      {
        id: 'b2',
        title: '代买早餐',
        counterpartName: '',
        amountMinor: 800,
        currency: 'MYR',
        role: 'helper',
      },
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

  test('a failed active-bounty check deletes nothing and answers check_failed', async () => {
    const d = deps({ findActiveBounties: mock(async () => Promise.reject(new Error('db'))) });
    const res = await handleAccountDelete(post('valid'), d);
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'check_failed' });
    expect(d.deleteUser).not.toHaveBeenCalled();
  });
});
