import { describe, expect, test } from 'bun:test';

import type { IapConfig } from '../_shared/iap/config.ts';
import {
  HOSTED_CONFIG,
  LOCAL_CONFIG,
  recordingStore,
  transaction,
  unsignedJws,
  USER,
} from '../_shared/iap/fakes.ts';
import { VerifyError, type VerifiedTransaction } from '../_shared/iap/jws.ts';
import type { StoreErrorCode } from '../_shared/iap/store.ts';
import { handleIapVerify } from './handler.ts';

type Options = {
  verified?: VerifiedTransaction | VerifyError;
  config?: IapConfig;
  storeFails?: StoreErrorCode;
};

function setup({ verified = transaction(), config = LOCAL_CONFIG, storeFails }: Options = {}) {
  const { store, calls } = recordingStore(storeFails ?? null);
  const verifications: string[] = [];
  const call = (body: unknown, token: string | null = 'valid', method = 'POST') =>
    handleIapVerify(
      new Request('http://localhost/iap-verify', {
        method,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: method === 'POST' ? JSON.stringify(body) : undefined,
      }),
      {
        userIdFromToken: async (t) => (t === 'valid' ? USER : null),
        async verifyTransaction(jws, environment) {
          verifications.push(environment);
          if (verified instanceof VerifyError) throw verified;
          return verified;
        },
        store,
        config,
      },
    );
  return { call, calls, verifications };
}

const sandboxJws = unsignedJws({ environment: 'Sandbox' });
const xcodeJws = unsignedJws({ environment: 'Xcode' });

async function expectError(response: Response, status: number, error: string) {
  expect({ status: response.status, body: await response.json() }).toEqual({
    status,
    body: { error },
  });
}

describe('iap-verify', () => {
  test('a request without a user token is refused before anything is read', async () => {
    const { call, calls, verifications } = setup();
    await expectError(await call({ signedTransaction: sandboxJws }, null), 401, 'unauthorized');
    await expectError(await call({ signedTransaction: sandboxJws }, 'stolen'), 401, 'unauthorized');
    expect([calls.length, verifications.length]).toEqual([0, 0]);
  });

  test('only POST is served', async () => {
    const { call } = setup();
    await expectError(await call(null, 'valid', 'GET'), 405, 'method_not_allowed');
  });

  test('a body without a readable signed transaction is a bad request', async () => {
    const { call, calls } = setup();
    await expectError(await call({}), 400, 'invalid_transaction');
    await expectError(await call({ signedTransaction: 'abc' }), 400, 'invalid_transaction');
    await expectError(
      await call({ signedTransaction: unsignedJws({ environment: 'Staging' }) }),
      400,
      'invalid_transaction',
    );
    expect(calls).toEqual([]);
  });

  test('a hosted project refuses Xcode transactions without verifying or writing', async () => {
    const { call, calls, verifications } = setup({
      config: HOSTED_CONFIG,
      verified: transaction({ environment: 'Xcode' }),
    });
    await expectError(await call({ signedTransaction: xcodeJws }), 403, 'environment_not_accepted');
    expect([calls.length, verifications.length]).toEqual([0, 0]);
  });

  test('the local stack accepts Xcode transactions', async () => {
    const { call, calls, verifications } = setup({
      verified: transaction({ environment: 'Xcode' }),
    });
    const response = await call({ signedTransaction: xcodeJws });
    expect(response.status).toBe(200);
    expect(verifications).toEqual(['Xcode']);
    expect(calls.map((c) => c.op)).toEqual(['credit']);
  });

  test('a verified purchase is credited to the signed-in user and the answer is returned', async () => {
    const { call, calls } = setup();
    const response = await call({ signedTransaction: sandboxJws });
    expect(await response.json()).toEqual({
      status: 'credited',
      transactionId: '2000000123456789',
      productId: 'app.tapiro.coins.5',
      coins: 5,
      environment: 'Sandbox',
      balance: 10,
    });
    expect(calls).toEqual([{ op: 'credit', buyer: USER, transaction: transaction() }]);
  });

  test('an account token in upper case still matches the user', async () => {
    const { call } = setup({ verified: transaction({ appAccountToken: USER.toUpperCase() }) });
    expect((await call({ signedTransaction: sandboxJws })).status).toBe(200);
  });

  test('a revoked transaction is sent to the refund path', async () => {
    const revoked = transaction({ revocationDate: Date.UTC(2026, 10, 12) });
    const { call, calls } = setup({ verified: revoked });
    const response = await call({ signedTransaction: sandboxJws });
    expect((await response.json()).status).toBe('revoked');
    expect(calls).toEqual([{ op: 'revoke', buyer: USER, transaction: revoked }]);
  });

  test.each([
    [
      'another user',
      { appAccountToken: '11111111-2222-4333-8444-555555555555' },
      403,
      'wrong_account',
    ],
    ['no account token', { appAccountToken: null }, 403, 'wrong_account'],
    ['a subscription', { type: 'Auto-Renewable Subscription' }, 422, 'not_consumable'],
    ['a quantity of 2', { quantity: 2 }, 422, 'unsupported_quantity'],
    ['another app', { bundleId: 'com.example.other' }, 422, 'unverified'],
    ['another environment than claimed', { environment: 'Production' }, 422, 'unverified'],
  ] as const)(
    'a transaction for %s is refused and nothing is written',
    async (_name, overrides, status, error) => {
      const { call, calls } = setup({
        verified: transaction(overrides as Partial<VerifiedTransaction>),
      });
      await expectError(await call({ signedTransaction: sandboxJws }), status, error);
      expect(calls).toEqual([]);
    },
  );

  test('a signature that fails verification is refused', async () => {
    const { call, calls } = setup({ verified: new VerifyError(false, 'apple_status_1') });
    await expectError(await call({ signedTransaction: sandboxJws }), 422, 'unverified');
    expect(calls).toEqual([]);
  });

  test('a retryable verification failure says so, so the app keeps the transaction', async () => {
    const { call, calls } = setup({ verified: new VerifyError(true, 'apple_status_2') });
    await expectError(
      await call({ signedTransaction: sandboxJws }),
      503,
      'verification_unavailable',
    );
    expect(calls).toEqual([]);
  });

  test.each([
    ['unknown_product', 422],
    ['transaction_owned_elsewhere', 403],
    ['store_failed', 500],
  ] as const)('a store failure %s maps to %s', async (code, status) => {
    const { call } = setup({ storeFails: code });
    await expectError(await call({ signedTransaction: sandboxJws }), status, code);
  });
});
