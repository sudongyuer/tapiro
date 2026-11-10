import { Environment, SignedDataVerifier } from 'npm:@apple/app-store-server-library@3.1.0';
import jsrsasign from 'npm:jsrsasign@11.1.5';

import { describe, expect, test } from 'bun:test';

import { handleIapNotify } from '../../iap-notify/handler.ts';
import { handleIapVerify } from '../../iap-verify/handler.ts';
import { appleVerifiers } from './apple.ts';
import { iapConfig, type IapConfig, type IapEnvironment } from './config.ts';
import { HOSTED_CONFIG, LOCAL_CONFIG, recordingStore, unsignedJws, USER } from './fakes.ts';
import { base64Der } from './jws.ts';

const { KEYUTIL, KJUR } = jsrsasign;

const LEAF_OID = '1.2.840.113635.100.6.11.1';
const INTERMEDIATE_OID = '1.2.840.113635.100.6.2.1';
const SIGNED_AT = Date.UTC(2026, 10, 11, 2);
const APP_APPLE_ID = 6740000000;
const PRODUCTION_CONFIG = iapConfig(
  (key) => ({ SUPABASE_URL: 'https://x.supabase.co', IAP_APP_APPLE_ID: String(APP_APPLE_ID) })[key],
);

type Key = { prvKeyObj: unknown; pubKeyObj: unknown };
type PkiOptions = {
  leafNotAfter?: string;
  leafOid?: string;
  intermediateOid?: string;
  intermediateCa?: boolean;
  chainLength?: number;
};

const keypair = (): Key => KEYUTIL.generateKeypair('EC', 'secp256r1');

function certificate(
  subject: string,
  issuer: string,
  key: Key,
  signer: Key,
  options: { ca: boolean; oid?: string; notAfter?: string },
) {
  const ext: Record<string, unknown>[] = [
    { extname: 'basicConstraints', cA: options.ca, critical: true },
  ];
  if (options.oid) ext.push({ extname: options.oid, extn: '0500' });
  const pem: string = new KJUR.asn1.x509.Certificate({
    version: 3,
    serial: { int: Math.floor(Math.random() * 1e9) },
    issuer: { str: issuer },
    subject: { str: subject },
    notbefore: '250101000000Z',
    notafter: options.notAfter ?? '351231000000Z',
    sbjpubkey: key.pubKeyObj,
    ext,
    sigalg: 'SHA256withECDSA',
    cakey: signer.prvKeyObj,
  }).getPEM();
  return pem.replace(/-----[^-]+-----|\s/g, '');
}

function testPki(options: PkiOptions = {}) {
  const root = keypair();
  const intermediate = keypair();
  const leaf = keypair();
  const rootCert = certificate('/CN=Tapiro Test Root', '/CN=Tapiro Test Root', root, root, {
    ca: true,
  });
  const chain = [
    certificate('/CN=Tapiro Test Leaf', '/CN=Tapiro Test Intermediate', leaf, intermediate, {
      ca: false,
      oid: options.leafOid ?? LEAF_OID,
      notAfter: options.leafNotAfter,
    }),
    certificate('/CN=Tapiro Test Intermediate', '/CN=Tapiro Test Root', intermediate, root, {
      ca: options.intermediateCa ?? true,
      oid: options.intermediateOid ?? INTERMEDIATE_OID,
    }),
    rootCert,
  ].slice(0, options.chainLength ?? 3);
  const sign = (payload: unknown) =>
    KJUR.jws.JWS.sign(
      'ES256',
      JSON.stringify({ alg: 'ES256', x5c: chain }),
      JSON.stringify(payload),
      leaf.prvKeyObj,
    ) as string;
  return { root: rootCert, sign };
}

function transactionPayload(overrides: Record<string, unknown> = {}) {
  return {
    transactionId: '2000000123456789',
    originalTransactionId: '2000000123456789',
    bundleId: 'app.tapiro',
    productId: 'app.tapiro.coins.35',
    purchaseDate: SIGNED_AT,
    originalPurchaseDate: SIGNED_AT,
    quantity: 1,
    type: 'Consumable',
    appAccountToken: USER,
    inAppOwnershipType: 'PURCHASED',
    signedDate: SIGNED_AT,
    environment: 'Sandbox',
    transactionReason: 'PURCHASE',
    storefront: 'MYS',
    storefrontId: '143473',
    price: 29900,
    currency: 'MYR',
    ...overrides,
  };
}

function refundNotification(signedTransactionInfo: string, data: Record<string, unknown> = {}) {
  return {
    notificationType: 'REFUND',
    notificationUUID: '6e1e3a8e-1c55-4a1e-8d2a-0a4f5b8c9d01',
    data: {
      appAppleId: APP_APPLE_ID,
      bundleId: 'app.tapiro',
      bundleVersion: '42',
      environment: 'Sandbox',
      signedTransactionInfo,
      ...data,
    },
    version: '2.0',
    signedDate: SIGNED_AT + 86_400_000,
  };
}

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
const variant = (options: PkiOptions) => {
  const pki = testPki(options);
  return { jws: pki.sign(transactionPayload()), root: pki.root };
};

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
