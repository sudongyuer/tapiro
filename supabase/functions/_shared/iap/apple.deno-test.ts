import { Environment, SignedDataVerifier } from 'npm:@apple/app-store-server-library@3.1.0';
import { describe, expect, test } from 'bun:test';

import { handleIapNotify } from '../../iap-notify/handler.ts';
import { handleIapVerify } from '../../iap-verify/handler.ts';
import { appleVerifiers } from './apple.ts';
import { iapConfig, type IapConfig, type IapEnvironment } from './config.ts';
import { HOSTED_CONFIG, LOCAL_CONFIG, recordingStore, unsignedJws, USER } from './fakes.ts';
import { base64Der } from './jws.ts';
import {
  APP_APPLE_ID,
  refundNotification,
  SIGNED_AT,
  testPki,
  transactionPayload,
  type PkiOptions,
} from './test-pki.ts';

const PRODUCTION_CONFIG = iapConfig(
  (key) => ({ SUPABASE_URL: 'https://x.supabase.co', IAP_APP_APPLE_ID: String(APP_APPLE_ID) })[key],
);

function forge(signed: string, payload: unknown) {
  const [header, , signature] = signed.split('.');
  return `${header}.${unsignedJws(payload).split('.')[1]}.${signature}`;
}

async function verdict(run: () => Promise<unknown>) {
  try {
    await run();
    return 'accepted';
  } catch {
    return 'rejected';
  }
}

type Case = {
  name: string;
  kind: 'transaction' | 'notification';
  jws: string;
  root: string;
  environment: IapEnvironment;
  config?: IapConfig;
  expected: 'accepted' | 'rejected';
};

const trusted = testPki();
const other = testPki();
const signed = (payload: Record<string, unknown> = {}) => trusted.sign(transactionPayload(payload));
const variant = (options: PkiOptions, payload = transactionPayload()) => {
  const pki = testPki(options);
  return { jws: pki.sign(payload), root: pki.root };
};
const { signedDate: _signedDate, ...undated } = transactionPayload();

const CASES: Case[] = [
  {
    name: 'a transaction signed through the trusted chain',
    kind: 'transaction',
    jws: signed(),
    root: trusted.root,
    environment: 'Sandbox',
    expected: 'accepted',
  },
  {
    name: 'a payload changed after signing',
    kind: 'transaction',
    jws: forge(signed(), transactionPayload({ productId: 'app.tapiro.coins.5' })),
    root: trusted.root,
    environment: 'Sandbox',
    expected: 'rejected',
  },
  {
    name: 'a chain from another root',
    kind: 'transaction',
    jws: other.sign(transactionPayload()),
    root: trusted.root,
    environment: 'Sandbox',
    expected: 'rejected',
  },
  {
    name: 'a leaf that expired before the signing date',
    kind: 'transaction',
    ...variant({ leafNotAfter: '260101000000Z' }),
    environment: 'Sandbox',
    expected: 'rejected',
  },
  {
    name: 'an intermediate that expired before the signing date',
    kind: 'transaction',
    ...variant({ intermediateNotAfter: '260101000000Z' }),
    environment: 'Sandbox',
    expected: 'rejected',
  },
  {
    name: 'a root that expired before the signing date',
    kind: 'transaction',
    ...variant({ rootNotAfter: '260101000000Z' }),
    environment: 'Sandbox',
    expected: 'rejected',
  },
  {
    name: 'a leaf not yet valid at the signing date',
    kind: 'transaction',
    ...variant({ leafNotBefore: '270101000000Z' }),
    environment: 'Sandbox',
    expected: 'rejected',
  },
  {
    name: 'a transaction without signedDate, checked at the current time',
    kind: 'transaction',
    jws: trusted.sign(undated),
    root: trusted.root,
    environment: 'Sandbox',
    expected: 'accepted',
  },
  {
    name: 'a transaction without signedDate whose leaf has expired by now',
    kind: 'transaction',
    ...variant({ leafNotAfter: '260601000000Z' }, undated),
    environment: 'Sandbox',
    expected: 'rejected',
  },
  {
    name: 'a header with alg none and no signature',
    kind: 'transaction',
    jws: trusted.withHeader({ alg: 'none', x5c: trusted.chain }, transactionPayload()),
    root: trusted.root,
    environment: 'Sandbox',
    expected: 'rejected',
  },
  {
    name: 'a header with alg none around a valid ES256 signature',
    kind: 'transaction',
    jws: trusted.withHeader(
      { alg: 'none', x5c: trusted.chain },
      transactionPayload(),
      signed().split('.')[2],
    ),
    root: trusted.root,
    environment: 'Sandbox',
    expected: 'rejected',
  },
  {
    name: 'an HS256 header keyed with the leaf certificate',
    kind: 'transaction',
    jws: trusted.hmac(transactionPayload()),
    root: trusted.root,
    environment: 'Sandbox',
    expected: 'rejected',
  },
  {
    name: 'a leaf without the Apple marker',
    kind: 'transaction',
    ...variant({ leafOid: '1.2.3.4' }),
    environment: 'Sandbox',
    expected: 'rejected',
  },
  {
    name: 'an intermediate without the Apple marker',
    kind: 'transaction',
    ...variant({ intermediateOid: '1.2.3.4' }),
    environment: 'Sandbox',
    expected: 'rejected',
  },
  {
    name: 'an intermediate that is not a CA',
    kind: 'transaction',
    ...variant({ intermediateCa: false }),
    environment: 'Sandbox',
    expected: 'rejected',
  },
  {
    name: 'a chain of two certificates',
    kind: 'transaction',
    ...variant({ chainLength: 2 }),
    environment: 'Sandbox',
    expected: 'rejected',
  },
  {
    name: 'another app',
    kind: 'transaction',
    jws: signed({ bundleId: 'com.example.other' }),
    root: trusted.root,
    environment: 'Sandbox',
    expected: 'rejected',
  },
  {
    name: 'a Production transaction checked as Sandbox',
    kind: 'transaction',
    jws: signed({ environment: 'Production' }),
    root: trusted.root,
    environment: 'Sandbox',
    expected: 'rejected',
  },
  {
    name: 'an unsigned Sandbox transaction',
    kind: 'transaction',
    jws: unsignedJws(transactionPayload()),
    root: trusted.root,
    environment: 'Sandbox',
    expected: 'rejected',
  },
  {
    name: 'an unsigned Xcode transaction on the local stack',
    kind: 'transaction',
    jws: unsignedJws(transactionPayload({ environment: 'Xcode' })),
    root: trusted.root,
    environment: 'Xcode',
    config: LOCAL_CONFIG,
    expected: 'accepted',
  },
  {
    name: 'a signed REFUND notification',
    kind: 'notification',
    jws: trusted.sign(refundNotification(signed())),
    root: trusted.root,
    environment: 'Sandbox',
    expected: 'accepted',
  },
  {
    name: 'an unsigned REFUND notification around a signed transaction',
    kind: 'notification',
    jws: unsignedJws(refundNotification(signed())),
    root: trusted.root,
    environment: 'Sandbox',
    expected: 'rejected',
  },
  {
    name: 'a REFUND notification from another root',
    kind: 'notification',
    jws: other.sign(refundNotification(signed())),
    root: trusted.root,
    environment: 'Sandbox',
    expected: 'rejected',
  },
  {
    name: 'a notification for another app',
    kind: 'notification',
    jws: trusted.sign(refundNotification(signed(), { bundleId: 'com.example.other' })),
    root: trusted.root,
    environment: 'Sandbox',
    expected: 'rejected',
  },
  {
    name: 'a Production notification with the configured app Apple ID',
    kind: 'notification',
    jws: trusted.sign(refundNotification(signed(), { environment: 'Production' })),
    root: trusted.root,
    environment: 'Production',
    config: PRODUCTION_CONFIG,
    expected: 'accepted',
  },
  {
    name: 'a Production notification with another app Apple ID',
    kind: 'notification',
    jws: trusted.sign(refundNotification(signed(), { environment: 'Production', appAppleId: 1 })),
    root: trusted.root,
    environment: 'Production',
    config: PRODUCTION_CONFIG,
    expected: 'rejected',
  },
];

function ours(c: Case) {
  const verifiers = appleVerifiers(c.config ?? HOSTED_CONFIG, [c.root]);
  return () => verifiers[c.kind](c.jws, c.environment);
}

function apples(c: Case) {
  const verifier = new SignedDataVerifier(
    [base64Der(c.root)] as never,
    false,
    c.environment as Environment,
    'app.tapiro',
    c.environment === 'Production' ? APP_APPLE_ID : undefined,
  );
  return () =>
    c.kind === 'transaction'
      ? verifier.verifyAndDecodeTransaction(c.jws)
      : verifier.verifyAndDecodeNotification(c.jws);
}

describe('our verifier agrees with Apple App Store Server Library 3.1.0', () => {
  for (const c of CASES) {
    test(`${c.name} is ${c.expected} by both`, async () => {
      expect({ ours: await verdict(ours(c)), apple: await verdict(apples(c)) }).toEqual({
        ours: c.expected,
        apple: c.expected,
      });
    });
  }

  test('a hosted config refuses Xcode and Production before looking at the data', async () => {
    const verifiers = appleVerifiers(HOSTED_CONFIG, [trusted.root]);
    const xcode = unsignedJws(transactionPayload({ environment: 'Xcode' }));
    expect(await verdict(() => verifiers.transaction(xcode, 'Xcode'))).toBe('rejected');
    expect(
      await verdict(() =>
        verifiers.transaction(signed({ environment: 'Production' }), 'Production'),
      ),
    ).toBe('rejected');
  });

  test('a verified transaction decodes to the fields the server uses', async () => {
    const verifiers = appleVerifiers(HOSTED_CONFIG, [trusted.root]);
    expect(
      await verifiers.transaction(signed({ revocationDate: SIGNED_AT + 1 }), 'Sandbox'),
    ).toEqual({
      transactionId: '2000000123456789',
      originalTransactionId: '2000000123456789',
      productId: 'app.tapiro.coins.35',
      bundleId: 'app.tapiro',
      environment: 'Sandbox',
      type: 'Consumable',
      quantity: 1,
      purchaseDate: SIGNED_AT,
      revocationDate: SIGNED_AT + 1,
      appAccountToken: USER,
    });
  });
});

describe('the handlers with the real verifier', () => {
  const verifiers = appleVerifiers(HOSTED_CONFIG, [trusted.root]);

  test('iap-verify credits a signed purchase and refuses a forged one', async () => {
    const { store, calls } = recordingStore();
    const call = (signedTransaction: string) =>
      handleIapVerify(
        new Request('http://localhost/iap-verify', {
          method: 'POST',
          headers: { Authorization: 'Bearer valid' },
          body: JSON.stringify({ signedTransaction }),
        }),
        {
          userIdFromToken: async () => USER,
          verifyTransaction: verifiers.transaction,
          store,
          config: HOSTED_CONFIG,
        },
      );
    expect((await call(signed())).status).toBe(200);
    const forged = forge(signed(), transactionPayload({ productId: 'app.tapiro.coins.5' }));
    expect((await call(forged)).status).toBe(422);
    expect(calls.map((c) => c.op)).toEqual(['credit']);
  });

  test('iap-notify applies a signed REFUND only when its transaction is signed too', async () => {
    const { store, calls } = recordingStore();
    const post = (signedPayload: string) =>
      handleIapNotify(
        new Request('http://localhost/iap-notify', {
          method: 'POST',
          body: JSON.stringify({ signedPayload }),
        }),
        {
          verifyNotification: verifiers.notification,
          verifyTransaction: verifiers.transaction,
          store,
          config: HOSTED_CONFIG,
        },
      );
    const refunded = signed({ revocationDate: SIGNED_AT + 3_600_000, revocationReason: 0 });
    expect((await post(trusted.sign(refundNotification(refunded)))).status).toBe(200);
    expect(calls).toEqual([
      expect.objectContaining({
        op: 'notification',
        notification: expect.objectContaining({
          notificationType: 'REFUND',
          environment: 'Sandbox',
        }),
        transaction: expect.objectContaining({ revocationDate: SIGNED_AT + 3_600_000 }),
      }),
    ]);
    const unsignedInner = unsignedJws(transactionPayload({ revocationDate: SIGNED_AT }));
    expect((await post(trusted.sign(refundNotification(unsignedInner)))).status).toBe(422);
    expect((await post(other.sign(refundNotification(refunded)))).status).toBe(422);
    expect(calls.length).toBe(1);
  });
});
