import { describe, expect, test } from 'bun:test';

import { APPLE_ROOT_CA_G3 } from './appleRoot.ts';
import { iapConfig } from './config.ts';
import { base64Der, peekNotificationEnvironment, peekTransactionEnvironment } from './jws.ts';

const HOSTED = 'https://abcdefghijklmnop.supabase.co';
const LOCAL = 'http://kong:8000';

const configFor = (vars: Record<string, string>) => iapConfig((key) => vars[key]);
const accepted = (vars: Record<string, string>) => [...configFor(vars).accepted].sort();

function unsigned(payload: unknown) {
  const part = (value: unknown) =>
    btoa(JSON.stringify(value)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${part({ alg: 'ES256' })}.${part(payload)}.c2ln`;
}

describe('iap config', () => {
  test('a hosted project without an app Apple ID accepts only Sandbox', () => {
    expect(accepted({ SUPABASE_URL: HOSTED })).toEqual(['Sandbox']);
  });

  test('a hosted project never accepts Xcode, even with the local flag set', () => {
    expect(accepted({ SUPABASE_URL: HOSTED, IAP_ALLOW_XCODE: '1' })).toEqual(['Sandbox']);
  });

  test('a local stack accepts Xcode only with the flag', () => {
    expect(accepted({ SUPABASE_URL: LOCAL })).toEqual(['Sandbox']);
    expect(accepted({ SUPABASE_URL: LOCAL, IAP_ALLOW_XCODE: '1' })).toEqual([
      'LocalTesting',
      'Sandbox',
      'Xcode',
    ]);
    expect(accepted({ SUPABASE_URL: 'http://127.0.0.1:54321', IAP_ALLOW_XCODE: '1' })).toContain(
      'Xcode',
    );
  });

  test('a host that only contains a local name is not local', () => {
    expect(accepted({ SUPABASE_URL: 'https://kong.example.com', IAP_ALLOW_XCODE: '1' })).toEqual([
      'Sandbox',
    ]);
    expect(accepted({ SUPABASE_URL: 'not a url', IAP_ALLOW_XCODE: '1' })).toEqual(['Sandbox']);
  });

  test('Production is accepted once the numeric app Apple ID is configured', () => {
    expect(configFor({ SUPABASE_URL: HOSTED, IAP_APP_APPLE_ID: '6740000000' })).toEqual({
      bundleId: 'app.tapiro',
      appAppleId: 6740000000,
      accepted: new Set(['Sandbox', 'Production']),
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
