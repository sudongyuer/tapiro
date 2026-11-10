import { describe, expect, test } from 'bun:test';

import { APPLE_ROOT_CA_G3 } from './appleRoot.ts';
import { iapConfig } from './config.ts';
import { LOCAL_ENV, serviceRoleKey } from './fakes.ts';
import {
  base64Der,
  peekNotificationEnvironment,
  peekTransactionEnvironment,
  toVerifiedTransaction,
} from './jws.ts';

const HOSTED = 'https://abcdefghijklmnop.supabase.co';
const TEST_ROOT = 'MIIBtest';

const configFor = (vars: Record<string, string>) => iapConfig((key) => vars[key]);
const accepted = (vars: Record<string, string>) => [...configFor(vars).accepted].sort();
const local = (overrides: Record<string, string> = {}) => ({ ...LOCAL_ENV, ...overrides });
const hosted = (overrides: Record<string, string> = {}) =>
  local({
    SUPABASE_URL: HOSTED,
    SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey('supabase'),
    SB_REGION: 'ap-southeast-1',
    DENO_DEPLOYMENT_ID: 'abcdefghijklmnop_fn_3',
    ...overrides,
  });

function unsigned(payload: unknown) {
  const part = (value: unknown) =>
    btoa(JSON.stringify(value)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${part({ alg: 'ES256' })}.${part(payload)}.c2ln`;
}

describe('iap config', () => {
  test('a hosted project without an app Apple ID accepts only Sandbox', () => {
    expect(accepted({ SUPABASE_URL: HOSTED })).toEqual(['Sandbox']);
  });

  test('a hosted project never accepts Xcode or a test root, even with local.env copied there', () => {
    expect(accepted(hosted({ IAP_TEST_ROOT: TEST_ROOT }))).toEqual(['Sandbox']);
    expect(configFor(hosted({ IAP_TEST_ROOT: TEST_ROOT })).testRoots).toEqual([]);
  });

  test('the local stack accepts Xcode only with the flag, and a test root only when one is set', () => {
    expect(accepted(local({ IAP_ALLOW_XCODE: '' }))).toEqual(['Sandbox']);
    expect(accepted(local())).toEqual(['LocalTesting', 'Sandbox', 'Xcode']);
    expect(accepted(local({ SUPABASE_URL: 'http://127.0.0.1:54321' }))).toContain('Xcode');
    expect(configFor(local()).testRoots).toEqual([]);
    expect(configFor(local({ IAP_TEST_ROOT: TEST_ROOT })).testRoots).toEqual([TEST_ROOT]);
  });

  test('a local URL is not enough: a server with its own service key is not the local stack', () => {
    const staging = local({
      SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey('supabase'),
      IAP_TEST_ROOT: TEST_ROOT,
    });
    expect(accepted(staging)).toEqual(['Sandbox']);
    expect(configFor(staging).testRoots).toEqual([]);
    expect(accepted(local({ SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_abc' }))).toEqual(['Sandbox']);
    expect(accepted(local({ SUPABASE_SERVICE_ROLE_KEY: '' }))).toEqual(['Sandbox']);
  });

  test('a variable only hosted functions get refuses the local paths', () => {
    for (const marker of ['SB_REGION', 'DENO_DEPLOYMENT_ID']) {
      const vars = local({ [marker]: 'x', IAP_TEST_ROOT: TEST_ROOT });
      expect(accepted(vars)).toEqual(['Sandbox']);
      expect(configFor(vars).testRoots).toEqual([]);
    }
    expect(accepted(local({ SB_EXECUTION_ID: 'b54e2b5b-2253-4a93-a967-090fa2ef2641' }))).toContain(
      'Xcode',
    );
  });

  test('a host that only contains a local name is not local', () => {
    expect(accepted(local({ SUPABASE_URL: 'https://kong.example.com' }))).toEqual(['Sandbox']);
    expect(accepted(local({ SUPABASE_URL: 'not a url' }))).toEqual(['Sandbox']);
  });

  test('Production is accepted once the numeric app Apple ID is configured', () => {
    expect(configFor({ SUPABASE_URL: HOSTED, IAP_APP_APPLE_ID: '6740000000' })).toEqual({
      bundleId: 'app.tapiro',
      appAppleId: 6740000000,
      accepted: new Set(['Sandbox', 'Production']),
      testRoots: [],
    });
    expect(accepted({ SUPABASE_URL: HOSTED, IAP_APP_APPLE_ID: 'abc' })).toEqual(['Sandbox']);
  });

  test('the bundled root is Apple Root CA - G3 by its published SHA-256 fingerprint', async () => {
    const digest = new Uint8Array(
      await crypto.subtle.digest('SHA-256', base64Der(APPLE_ROOT_CA_G3)),
    );
    const hex = [...digest].map((b) => b.toString(16).padStart(2, '0').toUpperCase()).join('');
    expect(hex).toBe('63343ABFB89A6A03EBB57E9B3F5FA7BE7C4F5C756F3017B3A8C488C3653E9179');
  });
});

describe('environment peek', () => {
  test('reads a transaction environment without trusting anything else', () => {
    expect(peekTransactionEnvironment(unsigned({ environment: 'Xcode' }))).toBe('Xcode');
    expect(peekTransactionEnvironment(unsigned({ environment: 'Staging' }))).toBeNull();
    expect(peekTransactionEnvironment('not.a-jws')).toBeNull();
    expect(peekTransactionEnvironment(42)).toBeNull();
    expect(peekTransactionEnvironment(`${'a'.repeat(40_000)}.b.c`)).toBeNull();
  });

  test('reads a notification environment from its data', () => {
    expect(peekNotificationEnvironment(unsigned({ data: { environment: 'Sandbox' } }))).toBe(
      'Sandbox',
    );
    expect(peekNotificationEnvironment(unsigned({ environment: 'Sandbox' }))).toBeNull();
  });
});

describe('transaction ids', () => {
  const payload = (environment: string, extra: Record<string, unknown> = {}) => ({
    transactionId: '0',
    originalTransactionId: '0',
    productId: 'app.tapiro.coins.5',
    bundleId: 'app.tapiro',
    purchaseDate: 1_762_800_000_000,
    environment,
    ...extra,
  });

  test('an Xcode id carries its purchase date, since Xcode restarts its numbering at 0', () => {
    const first = toVerifiedTransaction(payload('Xcode'));
    const later = toVerifiedTransaction(payload('Xcode', { purchaseDate: 1_762_800_060_000 }));
    expect(first.transactionId).toBe('xcode-1762800000000-0');
    expect(first.originalTransactionId).toBe('xcode-1762800000000-0');
    expect(later.transactionId).not.toBe(first.transactionId);
    const refunded = toVerifiedTransaction(payload('Xcode', { revocationDate: 1_762_800_120_000 }));
    expect(refunded.transactionId).toBe(first.transactionId);
  });

  test('App Store ids are kept as they are', () => {
    expect(toVerifiedTransaction(payload('Sandbox')).transactionId).toBe('0');
    expect(toVerifiedTransaction(payload('Production')).transactionId).toBe('0');
  });
});
