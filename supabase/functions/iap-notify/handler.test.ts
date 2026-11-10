import { describe, expect, test } from 'bun:test';

import type { IapConfig } from '../_shared/iap/config.ts';
import {
  HOSTED_CONFIG,
  notification,
  recordingStore,
  transaction,
  unsignedJws,
} from '../_shared/iap/fakes.ts';
import {
  VerifyError,
  type VerifiedNotification,
  type VerifiedTransaction,
} from '../_shared/iap/jws.ts';
import type { StoreErrorCode } from '../_shared/iap/store.ts';
import { handleIapNotify } from './handler.ts';

type Options = {
  verified?: VerifiedNotification | VerifyError;
  inner?: VerifiedTransaction | VerifyError;
  config?: IapConfig;
  storeFails?: StoreErrorCode;
};

function setup({
  verified = notification(),
  inner = transaction({ revocationDate: Date.UTC(2026, 10, 12), appAccountToken: null }),
  config = HOSTED_CONFIG,
  storeFails,
}: Options = {}) {
  const { store, calls } = recordingStore(storeFails ?? null);
  const verifiedJws: string[] = [];
  const post = (body: unknown, method = 'POST') =>
    handleIapNotify(
      new Request('http://localhost/iap-notify', {
        method,
        body: method === 'POST' ? JSON.stringify(body) : undefined,
      }),
      {
        async verifyNotification(jws) {
          verifiedJws.push(jws);
          if (verified instanceof VerifyError) throw verified;
          return verified;
        },
        async verifyTransaction(jws) {
          verifiedJws.push(jws);
          if (inner instanceof VerifyError) throw inner;
          return inner;
        },
        store,
        config,
      },
    );
  return { post, calls, verifiedJws };
}

const sandboxPayload = unsignedJws({ data: { environment: 'Sandbox' } });

async function expectError(response: Response, status: number, error: string) {
  expect({ status: response.status, body: await response.json() }).toEqual({
    status,
    body: { error },
  });
}

describe('iap-notify', () => {
  test('a verified REFUND notification and its transaction reach the store together', async () => {
    const { post, calls, verifiedJws } = setup();
    const response = await post({ signedPayload: sandboxPayload });
    expect({ status: response.status, body: await response.json() }).toEqual({
      status: 200,
      body: { status: 'revoked' },
    });
    expect(verifiedJws).toEqual([sandboxPayload, 'signed-transaction']);
    expect(calls).toEqual([
      {
        op: 'notification',
        notification: notification(),
        transaction: transaction({ revocationDate: Date.UTC(2026, 10, 12), appAccountToken: null }),
      },
    ]);
  });

  test('a notification without a transaction is passed on without one', async () => {
    const { post, calls } = setup({
      verified: notification({ notificationType: 'TEST', signedTransactionInfo: null }),
    });
    expect((await post({ signedPayload: sandboxPayload })).status).toBe(200);
    expect(calls).toEqual([
      {
        op: 'notification',
        notification: notification({ notificationType: 'TEST', signedTransactionInfo: null }),
        transaction: null,
      },
    ]);
  });

  test('only POST is served', async () => {
    const { post } = setup();
    await expectError(await post(null, 'GET'), 405, 'method_not_allowed');
  });

  test('a body without a readable payload is a bad request', async () => {
    const { post, calls } = setup();
    await expectError(await post({ signedPayload: 'x' }), 400, 'invalid_notification');
    await expectError(await post({ payload: sandboxPayload }), 400, 'invalid_notification');
    expect(calls).toEqual([]);
  });

  test('a hosted project refuses Xcode notifications before verifying', async () => {
    const { post, calls, verifiedJws } = setup();
    await expectError(
      await post({ signedPayload: unsignedJws({ data: { environment: 'Xcode' } }) }),
      403,
      'environment_not_accepted',
    );
    expect([calls.length, verifiedJws.length]).toEqual([0, 0]);
  });

  test('Production waits for the app Apple ID', async () => {
    const { post } = setup();
    await expectError(
      await post({ signedPayload: unsignedJws({ data: { environment: 'Production' } }) }),
      403,
      'environment_not_accepted',
    );
  });

  test.each([
    ['the notification', { verified: new VerifyError(false, 'apple_status_1') }, 422, 'unverified'],
    ['its transaction', { inner: new VerifyError(false, 'apple_status_1') }, 422, 'unverified'],
    [
      'OCSP',
      { verified: new VerifyError(true, 'apple_status_2') },
      503,
      'verification_unavailable',
    ],
    ['the bundle', { inner: transaction({ bundleId: 'com.example.other' }) }, 422, 'unverified'],
    ['the environment', { inner: transaction({ environment: 'Production' }) }, 422, 'unverified'],
  ] as const)('a failure in %s writes nothing', async (_name, options, status, error) => {
    const { post, calls } = setup(options as Options);
    await expectError(await post({ signedPayload: sandboxPayload }), status, error);
    expect(calls).toEqual([]);
  });

  test('a store failure answers 500 so Apple delivers it again', async () => {
    const { post } = setup({ storeFails: 'store_failed' });
    await expectError(await post({ signedPayload: sandboxPayload }), 500, 'store_failed');
  });
});
