import jsrsasign from 'npm:jsrsasign@11.1.5';

import { unsignedJws, USER } from './fakes.ts';

const { KEYUTIL, KJUR } = jsrsasign;

const LEAF_OID = '1.2.840.113635.100.6.11.1';
const INTERMEDIATE_OID = '1.2.840.113635.100.6.2.1';
export const SIGNED_AT = Date.UTC(2026, 10, 11, 2);
export const APP_APPLE_ID = 6740000000;

type Key = { prvKeyObj: unknown; pubKeyObj: unknown };
export type PkiOptions = {
  leafNotBefore?: string;
  leafNotAfter?: string;
  intermediateNotAfter?: string;
  rootNotAfter?: string;
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
  options: { ca: boolean; oid?: string; notBefore?: string; notAfter?: string },
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
    notbefore: options.notBefore ?? '250101000000Z',
    notafter: options.notAfter ?? '351231000000Z',
    sbjpubkey: key.pubKeyObj,
    ext,
    sigalg: 'SHA256withECDSA',
    cakey: signer.prvKeyObj,
  }).getPEM();
  return pem.replace(/-----[^-]+-----|\s/g, '');
}

export function testPki(options: PkiOptions = {}) {
  const root = keypair();
  const intermediate = keypair();
  const leaf = keypair();
  const rootCert = certificate('/CN=Tapiro Test Root', '/CN=Tapiro Test Root', root, root, {
    ca: true,
    notAfter: options.rootNotAfter,
  });
  const chain = [
    certificate('/CN=Tapiro Test Leaf', '/CN=Tapiro Test Intermediate', leaf, intermediate, {
      ca: false,
      oid: options.leafOid ?? LEAF_OID,
      notBefore: options.leafNotBefore,
      notAfter: options.leafNotAfter,
    }),
    certificate('/CN=Tapiro Test Intermediate', '/CN=Tapiro Test Root', intermediate, root, {
      ca: options.intermediateCa ?? true,
      oid: options.intermediateOid ?? INTERMEDIATE_OID,
      notAfter: options.intermediateNotAfter,
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
  const withHeader = (header: Record<string, unknown>, payload: unknown, signature = '') =>
    `${unsignedJws(header).split('.')[1]}.${unsignedJws(payload).split('.')[1]}.${signature}`;
  const hmac = (payload: unknown) =>
    KJUR.jws.JWS.sign(
      'HS256',
      JSON.stringify({ alg: 'HS256', x5c: chain }),
      JSON.stringify(payload),
      { b64: chain[0] },
    ) as string;
  return { root: rootCert, chain, sign, withHeader, hmac };
}

export function transactionPayload(overrides: Record<string, unknown> = {}) {
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

export function refundNotification(
  signedTransactionInfo: string,
  data: Record<string, unknown> = {},
) {
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
