import { describe, expect, test } from 'bun:test';

import { isLocalSupabaseUrl, testAccountsEnabled } from './testAccounts';

const local = 'http://127.0.0.1:54321';

describe('test accounts gate', () => {
  test('shows in a development build connected to the local stack', () => {
    expect(testAccountsEnabled({ dev: true, verify: false, supabaseUrl: local })).toBe(true);
    expect(
      testAccountsEnabled({ dev: true, verify: false, supabaseUrl: 'http://localhost:54321' }),
    ).toBe(true);
  });

  test('never shows in a release build', () => {
    expect(testAccountsEnabled({ dev: false, verify: false, supabaseUrl: local })).toBe(false);
  });

  test('never shows in verify mode', () => {
    expect(testAccountsEnabled({ dev: true, verify: true, supabaseUrl: local })).toBe(false);
  });

  test('never shows against a hosted or missing project', () => {
    expect(
      testAccountsEnabled({
        dev: true,
        verify: false,
        supabaseUrl: 'https://abcdefgh.supabase.co',
      }),
    ).toBe(false);
    expect(testAccountsEnabled({ dev: true, verify: false, supabaseUrl: undefined })).toBe(false);
  });
});

describe('local supabase url', () => {
  test('accepts loopback hosts with any port or path', () => {
    expect(isLocalSupabaseUrl('http://127.0.0.1:54321')).toBe(true);
    expect(isLocalSupabaseUrl('http://LOCALHOST:54321/')).toBe(true);
    expect(isLocalSupabaseUrl('http://[::1]:54321')).toBe(true);
  });

  test('rejects hosts that only contain a local name', () => {
    expect(isLocalSupabaseUrl('https://127.0.0.1.example.com')).toBe(false);
    expect(isLocalSupabaseUrl('https://localhost.evil.dev:54321')).toBe(false);
    expect(isLocalSupabaseUrl('https://user@127.0.0.1@example.com')).toBe(false);
    expect(isLocalSupabaseUrl('http://192.168.1.10:54321')).toBe(false);
    expect(isLocalSupabaseUrl('')).toBe(false);
  });
});
