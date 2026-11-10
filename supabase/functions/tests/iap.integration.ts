import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { localSupabase } from '../../../scripts/local-supabase';
import pki from './iap-test-pki.json';

const url = localSupabase('API_URL');
const anonKey = localSupabase('ANON_KEY');
const serviceKey = localSupabase('SERVICE_ROLE_KEY');
const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const password = `pw-${crypto.randomUUID()}`;
const run = crypto.randomUUID().slice(0, 8);

type Buyer = { id: string; token: string; client: SupabaseClient };
const buyers: Buyer[] = [];

function part(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function xcodeJws(payload: Record<string, unknown>) {
  return `${part({ alg: 'ES256', kid: 'Apple_Xcode_Key' })}.${part(payload)}.c2ln`;
}

async function testRootJws(payload: Record<string, unknown>) {
  const key = await crypto.subtle.importKey(
    'jwk',
    pki.leafKey,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );
  const input = `${part({ alg: 'ES256', x5c: [pki.leaf, pki.intermediate, pki.root] })}.${part(payload)}`;
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(input),
  );
  return `${input}.${Buffer.from(signature).toString('base64url')}`;
}

const purchasedAt = Date.now();
const stored = (id: string) => `xcode-${purchasedAt}-${id}`;

function xcodeTransaction(id: string, token: string, extra: Record<string, unknown> = {}) {
  return xcodeJws({
    transactionId: id,
    originalTransactionId: id,
    bundleId: 'app.tapiro',
    productId: 'app.tapiro.coins.11',
    purchaseDate: purchasedAt,
    quantity: 1,
    type: 'Consumable',
    appAccountToken: token,
    signedDate: Date.now(),
    environment: 'Xcode',
    ...extra,
  });
}

function verify(signedTransaction: string, bearer: string) {
  return fetch(`${url}/functions/v1/iap-verify`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${bearer}`,
      apikey: anonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ signedTransaction }),
  });
}

function notify(signedPayload: string) {
  return fetch(`${url}/functions/v1/iap-notify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ signedPayload }),
  });
}

async function coins(buyer: Buyer) {
  const { data, error } = await buyer.client.rpc('coin_balance');
  if (error) throw error;
  return (data as { coins: number }).coins;
}

async function newBuyer(): Promise<Buyer> {
  const email = `iap-${crypto.randomUUID()}@example.test`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: 'IAP Test' },
  });
  if (error) throw error;
  const client = createClient(url, anonKey, { auth: { persistSession: false } });
  const signIn = await client.auth.signInWithPassword({ email, password });
  if (signIn.error) throw signIn.error;
  const buyer = { id: data.user.id, token: signIn.data.session.access_token, client };
  buyers.push(buyer);
  return buyer;
}

let alice: Buyer;
let bob: Buyer;

beforeAll(async () => {
  alice = await newBuyer();
  bob = await newBuyer();
});

afterAll(async () => {
  for (const buyer of buyers) await admin.auth.admin.deleteUser(buyer.id);
});

describe('iap-verify and iap-notify on the local stack (Xcode environment)', () => {
  const purchase = `xcode-${run}-1`;

  test('a call without a user token is refused', async () => {
    const response = await verify(xcodeTransaction(purchase, alice.id), anonKey);
    expect(response.status).toBe(401);
  });

  test('a local StoreKit purchase is credited once, with the pack from the server table', async () => {
    const before = await coins(alice);
    const first = await verify(
      xcodeTransaction(purchase, alice.id, { productId: 'app.tapiro.coins.11' }),
      alice.token,
    );
    expect({ status: first.status, body: await first.json() }).toEqual({
      status: 200,
      body: {
        status: 'credited',
        transactionId: stored(purchase),
        productId: 'app.tapiro.coins.11',
        coins: 11,
        environment: 'Xcode',
        balance: before + 11,
      },
    });
    const again = await verify(xcodeTransaction(purchase, alice.id), alice.token);
    expect((await again.json()).status).toBe('duplicate');
    expect(await coins(alice)).toBe(before + 11);
  });

  test('another user cannot claim the purchase, with or without its token', async () => {
    const before = await coins(bob);
    const theirs = await verify(xcodeTransaction(purchase, bob.id), bob.token);
    expect({ status: theirs.status, body: await theirs.json() }).toEqual({
      status: 403,
      body: { error: 'transaction_owned_elsewhere' },
    });
    const stolen = await verify(xcodeTransaction(purchase, alice.id), bob.token);
    expect({ status: stolen.status, body: await stolen.json() }).toEqual({
      status: 403,
      body: { error: 'wrong_account' },
    });
    expect(await coins(bob)).toBe(before);
  });

  test('a refund seen by the app takes the pack back', async () => {
    const before = await coins(alice);
    const refunded = xcodeTransaction(purchase, alice.id, {
      revocationDate: Date.now(),
      revocationReason: 0,
    });
    const response = await verify(refunded, alice.token);
    expect((await response.json()).status).toBe('revoked');
    expect(await coins(alice)).toBe(before - 11);
  });

  test('a REFUND notification revokes a purchase once, then a reversal gives it back', async () => {
    const id = `xcode-${run}-2`;
    await verify(xcodeTransaction(id, bob.id, { productId: 'app.tapiro.coins.5' }), bob.token);
    const before = await coins(bob);
    const refund = (uuid: string, type: string, extra: Record<string, unknown>) =>
      xcodeJws({
        notificationType: type,
        notificationUUID: uuid,
        version: '2.0',
        signedDate: Date.now(),
        data: {
          bundleId: 'app.tapiro',
          environment: 'Xcode',
          signedTransactionInfo: xcodeTransaction(id, bob.id, {
            productId: 'app.tapiro.coins.5',
            ...extra,
          }),
        },
      });
    const notice = refund(crypto.randomUUID(), 'REFUND', { revocationDate: Date.now() });
    expect(await (await notify(notice)).json()).toEqual({ status: 'revoked' });
    expect(await (await notify(notice)).json()).toEqual({ status: 'duplicate' });
    expect(await coins(bob)).toBe(before - 5);
    const reversal = refund(crypto.randomUUID(), 'REFUND_REVERSED', {});
    expect(await (await notify(reversal)).json()).toEqual({ status: 'reinstated' });
    expect(await coins(bob)).toBe(before);
  });

  test('an unknown product is refused and credits nothing', async () => {
    const before = await coins(alice);
    const response = await verify(
      xcodeTransaction(`xcode-${run}-3`, alice.id, { productId: 'app.tapiro.coins.999' }),
      alice.token,
    );
    expect(response.status).toBe(422);
    expect(await coins(alice)).toBe(before);
  });
});

describe('a Sandbox transaction signed through the local test root, verified inside the Edge Runtime', () => {
  const sandboxTransaction = (id: string, buyer: Buyer, extra: Record<string, unknown> = {}) => ({
    transactionId: id,
    originalTransactionId: id,
    bundleId: 'app.tapiro',
    productId: 'app.tapiro.coins.35',
    purchaseDate: Date.now(),
    quantity: 1,
    type: 'Consumable',
    appAccountToken: buyer.id,
    signedDate: Date.now(),
    environment: 'Sandbox',
    ...extra,
  });
  const notice = async (type: string, signedTransactionInfo: string) =>
    testRootJws({
      notificationType: type,
      notificationUUID: crypto.randomUUID(),
      version: '2.0',
      signedDate: Date.now(),
      data: { bundleId: 'app.tapiro', environment: 'Sandbox', signedTransactionInfo },
    });

  test('a signed purchase is credited and the same JWS with a changed product is refused', async () => {
    const id = `sandbox-${run}-1`;
    const before = await coins(alice);
    const jws = await testRootJws(sandboxTransaction(id, alice));
    const response = await verify(jws, alice.token);
    expect({ status: response.status, body: await response.json() }).toMatchObject({
      status: 200,
      body: { status: 'credited', coins: 35, environment: 'Sandbox', balance: before + 35 },
    });
    const [header, , signature] = jws.split('.');
    const forged = `${header}.${part(sandboxTransaction(`sandbox-${run}-2`, alice))}.${signature}`;
    const refused = await verify(forged, alice.token);
    expect({ status: refused.status, body: await refused.json() }).toEqual({
      status: 422,
      body: { error: 'unverified' },
    });
    expect(await coins(alice)).toBe(before + 35);
  });

  test('signed REFUND and REFUND_REVERSED notifications take the pack back and return it', async () => {
    const id = `sandbox-${run}-3`;
    await verify(await testRootJws(sandboxTransaction(id, bob)), bob.token);
    const before = await coins(bob);
    const refunded = await testRootJws(sandboxTransaction(id, bob, { revocationDate: Date.now() }));
    const refund = await notify(await notice('REFUND', refunded));
    expect({ status: refund.status, body: await refund.json() }).toEqual({
      status: 200,
      body: { status: 'revoked' },
    });
    expect(await coins(bob)).toBe(before - 35);
    const reversal = await notify(
      await notice('REFUND_REVERSED', await testRootJws(sandboxTransaction(id, bob))),
    );
    expect(await reversal.json()).toEqual({ status: 'reinstated' });
    expect(await coins(bob)).toBe(before);
  });

  test('a notification signed by the test root around an unsigned transaction is refused', async () => {
    const unsignedInner = xcodeJws(sandboxTransaction(`sandbox-${run}-4`, bob));
    const response = await notify(await notice('REFUND', unsignedInner));
    expect(response.status).toBe(422);
  });
});
