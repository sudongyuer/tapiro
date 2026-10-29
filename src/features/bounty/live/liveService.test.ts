import { describe, expect, test } from 'bun:test';
import type { SupabaseClient } from '@supabase/supabase-js';

import { createSupabaseLiveService } from './liveService';

type Answer = { data?: unknown; error?: unknown };

function stubClient(answer: (name: string, args: unknown) => Answer | Promise<never>) {
  const calls: { name: string; args: unknown }[] = [];
  const client = {
    rpc: async (name: string, args: unknown) => {
      calls.push({ name, args });
      return answer(name, args);
    },
  } as unknown as SupabaseClient;
  return { service: createSupabaseLiveService(client), calls };
}

const ROW = {
  bountyId: 'b1',
  title: '帮取快递',
  category: 'pickup',
  rewardMinor: 1500,
  rewardCurrency: 'MYR',
  role: 'applicant',
  kind: 'bountyInProgress',
  action: null,
  card: null,
  status: 'open',
  counterpartName: '小林',
  applicantCount: null,
  startsAt: '2026-10-29T08:00:00+00:00',
  startLate: false,
  etaAt: null,
  previousEtaAt: null,
  autoConfirmAt: null,
  issueReason: null,
  refund: null,
};

describe('bounty_live_items', () => {
  test('parses every key of a row', async () => {
    const stub = stubClient(() => ({
      data: [
        ROW,
        {
          ...ROW,
          bountyId: 'b2',
          role: 'poster',
          kind: 'oneTime',
          card: 'expired',
          status: 'closed',
          refund: 'coin',
        },
      ],
      error: null,
    }));
    const rows = await stub.service.list();
    expect(stub.calls).toEqual([{ name: 'bounty_live_items', args: undefined }]);
    const { rewardMinor, rewardCurrency, ...rest } = ROW;
    expect(rows[0]).toEqual({
      ...rest,
      reward: { minor: rewardMinor, currency: rewardCurrency },
    } as never);
    expect(rows[1]).toMatchObject({
      role: 'poster',
      kind: 'oneTime',
      card: 'expired',
      refund: 'coin',
    });
  });

  test('an error or an unknown kind rejects instead of reading as empty', async () => {
    await expect(
      stubClient(() => ({ data: null, error: { message: 'boom' } })).service.list(),
    ).rejects.toBeDefined();
    await expect(
      stubClient(() => ({ data: [{ ...ROW, kind: 'other' }], error: null })).service.list(),
    ).rejects.toThrow('kind');
    await expect(
      stubClient(() => ({ data: [{ ...ROW, rewardCurrency: 'USD' }], error: null })).service.list(),
    ).rejects.toThrow('reward');
    await expect(stubClient(() => ({ data: null, error: null })).service.list()).rejects.toThrow();
  });
});

describe('mark_bounty_seen', () => {
  test('passes the card and reports success', async () => {
    const stub = stubClient(() => ({ data: null, error: null }));
    expect(await stub.service.markSeen('b1', 'not_selected')).toBe(true);
    expect(stub.calls).toEqual([
      { name: 'mark_bounty_seen', args: { bounty: 'b1', card: 'not_selected' } },
    ]);
  });

  test('an error or a network failure reports false', async () => {
    expect(
      await stubClient(() => ({
        data: null,
        error: { message: 'bounty_not_found' },
      })).service.markSeen('b1', 'expired'),
    ).toBe(false);
    expect(
      await stubClient(() =>
        Promise.reject(new TypeError('Network request failed')),
      ).service.markSeen('b1', 'expired'),
    ).toBe(false);
  });
});
