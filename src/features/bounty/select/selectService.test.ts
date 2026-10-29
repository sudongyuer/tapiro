import { describe, expect, test } from 'bun:test';
import type { SupabaseClient } from '@supabase/supabase-js';

import { createSupabaseSelectService } from './selectService';

type Answer = { data?: unknown; error?: unknown };

function stubClient(answer: (name: string, args: unknown) => Answer | Promise<never>) {
  const calls: { name: string; args: unknown }[] = [];
  const client = {
    rpc: async (name: string, args: unknown) => {
      calls.push({ name, args });
      return answer(name, args);
    },
  } as unknown as SupabaseClient;
  return { service: createSupabaseSelectService(client), calls };
}

const ok = (data: unknown): Answer => ({ data, error: null });
const rejected = (message: string, code = '55000'): Answer => ({
  data: null,
  error: { message, code },
});
const offline = () => Promise.reject(new TypeError('Network request failed'));

const ROW = {
  applicantId: 'a1',
  name: '阿杰',
  tier: 'very_reliable',
  note: '十分钟到',
  status: 'pending',
  appliedAt: '2026-10-28T03:00:00+00:00',
  helpedCount: 14,
};

describe('applicants', () => {
  test('passes the bounty and parses every key', async () => {
    const stub = stubClient(() =>
      ok([
        ROW,
        { ...ROW, applicantId: 'a2', name: null, note: null, status: 'selected', helpedCount: 0 },
      ]),
    );
    expect(await stub.service.applicants('b1')).toEqual([
      {
        id: 'a1',
        name: '阿杰',
        tier: 'very_reliable',
        note: '十分钟到',
        status: 'pending',
        appliedAt: '2026-10-28T03:00:00+00:00',
        helpedCount: 14,
      },
      {
        id: 'a2',
        name: null,
        tier: 'very_reliable',
        note: null,
        status: 'selected',
        appliedAt: '2026-10-28T03:00:00+00:00',
        helpedCount: 0,
      },
    ]);
    expect(stub.calls).toEqual([{ name: 'bounty_applicants', args: { bounty: 'b1' } }]);
  });

  test.each([
    ['applicantId', { ...ROW, applicantId: 7 }],
    ['tier', { ...ROW, tier: 'gold' }],
    ['status', { ...ROW, status: 'not_selected' }],
    ['appliedAt', { ...ROW, appliedAt: null }],
    ['helpedCount', { ...ROW, helpedCount: -1 }],
    ['helpedCount', { ...ROW, helpedCount: 1.5 }],
    ['helpedCount', { ...ROW, helpedCount: undefined }],
    ['note', { ...ROW, note: 3 }],
    ['applicant', 'a1'],
  ])('a malformed %s rejects the whole list', async (what, bad) => {
    const stub = stubClient(() => ok([ROW, bad]));
    await expect(stub.service.applicants('b1')).rejects.toThrow(what);
  });

  test('a body that is not a list rejects', async () => {
    await expect(stubClient(() => ok({ items: [ROW] })).service.applicants('b1')).rejects.toThrow(
      'applicants',
    );
    await expect(stubClient(() => ok(null)).service.applicants('b1')).rejects.toThrow('applicants');
  });

  test('not found and not poster read as gone; other errors throw', async () => {
    expect(
      await stubClient(() => rejected('bounty_not_found', 'P0002')).service.applicants('b1'),
    ).toBe('gone');
    expect(await stubClient(() => rejected('not_poster', '42501')).service.applicants('b1')).toBe(
      'gone',
    );
    await expect(
      stubClient(() => rejected('boom', 'XX000')).service.applicants('b1'),
    ).rejects.toBeDefined();
    await expect(stubClient(offline).service.applicants('b1')).rejects.toThrow('Network');
  });
});

describe('select', () => {
  test('passes the bounty and applicant and answers the helper', async () => {
    const stub = stubClient(() => ok({ status: 'assigned', helperId: 'a1' }));
    expect(await stub.service.select('b1', 'a1')).toEqual({ ok: true, helperId: 'a1' });
    expect(stub.calls).toEqual([
      { name: 'select_helper', args: { bounty: 'b1', applicant: 'a1' } },
    ]);
  });

  test.each([
    ['taken', 'taken'],
    ['closed', 'closed'],
    ['not_pending', 'notPending'],
    ['blocked', 'notPending'],
    ['no_payee_method', 'noPayee'],
    ['bounty_not_found', 'gone'],
    ['not_poster', 'gone'],
    ['something_new', 'failed'],
  ] as const)('%s answers %s', async (slug, reason) => {
    const stub = stubClient(() => rejected(slug));
    expect(await stub.service.select('b1', 'a1')).toEqual({ ok: false, reason });
  });

  test('a network error or an unexpected answer is failed, never ok', async () => {
    expect(await stubClient(offline).service.select('b1', 'a1')).toEqual({
      ok: false,
      reason: 'failed',
    });
    for (const data of [null, { status: 'open', helperId: 'a1' }, { status: 'assigned' }]) {
      expect(await stubClient(() => ok(data)).service.select('b1', 'a1')).toEqual({
        ok: false,
        reason: 'failed',
      });
    }
  });

  test('without a client select fails instead of throwing', async () => {
    expect(await createSupabaseSelectService(null).select('b1', 'a1')).toEqual({
      ok: false,
      reason: 'failed',
    });
  });
});

describe('markNotSelectedSeen', () => {
  test('passes the bounty and card and swallows failures', async () => {
    const stub = stubClient(() => ok(null));
    await stub.service.markNotSelectedSeen('b1');
    expect(stub.calls).toEqual([
      { name: 'mark_bounty_seen', args: { bounty: 'b1', card: 'not_selected' } },
    ]);
    expect(await stubClient(offline).service.markNotSelectedSeen('b1')).toBeUndefined();
  });
});
