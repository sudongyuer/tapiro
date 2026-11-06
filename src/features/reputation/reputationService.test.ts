import { describe, expect, test } from 'bun:test';
import type { SupabaseClient } from '@supabase/supabase-js';

import { createReviewDrafts } from './drafts';
import { createFixtureReputationService } from './fixtureReputationService';
import { AccessoryError, createSupabaseReputationService } from './reputationService';
import { memorySettings } from './storeHarness';

type Answer = { data?: unknown; error?: unknown };

function stubClient(answer: (name: string) => Answer | Promise<never>) {
  const calls: { name: string; args: unknown }[] = [];
  const client = {
    rpc: async (name: string, args: unknown) => {
      calls.push({ name, args });
      return answer(name);
    },
  } as unknown as SupabaseClient;
  return { service: createSupabaseReputationService(client), calls };
}

const TARGET = { kind: 'ride' as const, itemId: 'r1', reviewee: 'p1' };
const DRAFT = { face: 'okay' as const, chips: ['late'], sentence: null };

describe('supabase reputation service', () => {
  test('submit sends the RPC arguments and maps refusals to typed failures', async () => {
    for (const [message, failure] of [
      ['review_closed', 'closed'],
      ['review_locked', 'locked'],
      ['invalid_review', 'invalid'],
      ['review_not_found', 'notFound'],
      ['something else', 'failed'],
    ] as const) {
      const { service, calls } = stubClient(() => ({ error: { message } }));
      expect(await service.submitReview(TARGET, DRAFT)).toEqual({ ok: false, failure });
      expect(calls[0]).toEqual({
        name: 'submit_review',
        args: {
          kind: 'ride',
          item: 'r1',
          reviewee: 'p1',
          face: 'okay',
          chips: ['late'],
          sentence: null,
        },
      });
    }
  });

  test('a network error or an unreadable answer is a plain failure', async () => {
    const thrown = stubClient(() => Promise.reject(new Error('offline')));
    expect(await thrown.service.submitReview(TARGET, DRAFT)).toEqual({
      ok: false,
      failure: 'failed',
    });
    const garbled = stubClient(() => ({ data: { state: 'nope' } }));
    expect(await garbled.service.submitReview(TARGET, DRAFT)).toEqual({
      ok: false,
      failure: 'failed',
    });
  });

  test('reply maps already_replied and passes the review id', async () => {
    const { service, calls } = stubClient(() => ({ error: { message: 'already_replied' } }));
    expect(await service.reply('rv1', '谢谢')).toEqual({ ok: false, failure: 'alreadyReplied' });
    expect(calls[0]).toEqual({ name: 'reply_to_review', args: { review: 'rv1', body: '谢谢' } });
  });

  test('reads throw on errors instead of answering empty', async () => {
    const { service } = stubClient(() => ({ error: { message: 'boom' } }));
    await expect(service.pendingReviews()).rejects.toBeDefined();
    await expect(service.reviewState('bounty', 'b1')).rejects.toBeDefined();
    await expect(service.profile('p1')).rejects.toBeDefined();
  });

  test('profile reviews page 20 at a time with the cursor', async () => {
    const { service, calls } = stubClient(() => ({
      data: { items: [], hasMore: false, nextCursor: null },
    }));
    await service.profileReviews('p1', 'a|b');
    expect(calls[0]).toEqual({
      name: 'profile_reviews',
      args: { person: 'p1', before: 'a|b', max_count: 20 },
    });
  });

  test('a locked accessory throws its typed reason', async () => {
    const { service } = stubClient(() => ({ error: { message: 'accessory_locked' } }));
    const error = await service.setAccessory('scarf').catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(AccessoryError);
    expect((error as AccessoryError).failure).toBe('locked');
  });
});

describe('review drafts', () => {
  test('drafts survive a new instance, drop empty entries and are kept per user', () => {
    const settings = memorySettings();
    const first = createReviewDrafts(settings);
    first.setReview('u1', 'bounty:b1:p1', { face: 'happy', chips: ['on_time'], sentence: '' });
    first.setReply('u1', 'rv1', '谢谢');
    first.setReview('u1', 'bounty:b2:p1', { face: null, chips: [], sentence: '' });
    const second = createReviewDrafts(settings);
    expect(second.review('u1', 'bounty:b1:p1')).toEqual({
      face: 'happy',
      chips: ['on_time'],
      sentence: '',
    });
    expect(second.review('u1', 'bounty:b2:p1')).toBeNull();
    expect(second.reply('u1', 'rv1')).toBe('谢谢');
    expect(second.review('u2', 'bounty:b1:p1')).toBeNull();
    second.clear('u1');
    expect(createReviewDrafts(settings).reply('u1', 'rv1')).toBe('');
  });

  test('a corrupt stored value reads as no drafts', () => {
    const settings = memorySettings();
    settings.set({ 'tapiro.reviewDrafts.u1': '{"reviews":{"x":{"face":"meh"}}' });
    expect(createReviewDrafts(settings).review('u1', 'x')).toBeNull();
    settings.set({
      'tapiro.reviewDrafts.u2': '{"reviews":{"x":{"face":"meh","chips":[],"sentence":""}}}',
    });
    expect(createReviewDrafts(settings).review('u2', 'x')).toBeNull();
  });
});

describe('fixture reputation service', () => {
  const now = () => new Date('2026-11-06T04:00:00Z');

  test('failed fails each read once, then answers', async () => {
    const service = createFixtureReputationService({ variant: 'failed', now });
    await expect(service.pendingReviews()).rejects.toBeDefined();
    expect((await service.pendingReviews()).length).toBeGreaterThan(0);
    await expect(service.profile('fixture-person-mei')).rejects.toBeDefined();
    expect((await service.profile('fixture-person-mei')).reviewCount).toBe(24);
  });

  test('empty has nothing to review and a new profile', async () => {
    const service = createFixtureReputationService({ variant: 'empty', now });
    expect(await service.pendingReviews()).toEqual([]);
    const profile = await service.profile('fixture-person-mei');
    expect(profile).toMatchObject({ reviewCount: 0, completionRate: null, tier: 'new_friend' });
  });

  test('a submit seals the review, or reveals it when they already reviewed', async () => {
    const service = createFixtureReputationService({ variant: 'many', now });
    const bounty = await service.submitReview(
      { kind: 'bounty', itemId: 'b1', reviewee: 'fixture-person-lin' },
      { face: 'happy', chips: ['on_time'], sentence: null },
    );
    expect(bounty.ok && bounty.pair.state).toBe('revealed');
    const ride = await service.submitReview(
      { kind: 'ride', itemId: 'r1', reviewee: 'fixture-person-mei' },
      { face: 'happy', chips: ['on_time'], sentence: null },
    );
    expect(ride.ok && ride.pair.state).toBe('sealed');
    const ended = await service.submitReview(
      { kind: 'ride', itemId: 'r1', reviewee: 'fixture-person-siti' },
      { face: 'happy', chips: [], sentence: null },
    );
    expect(ended).toEqual({ ok: false, failure: 'closed' });
  });

  test('profile reviews page through the worst-case list without repeats', async () => {
    const service = createFixtureReputationService({ variant: 'worst', now });
    const seen: string[] = [];
    let cursor: string | null = null;
    do {
      const page = await service.profileReviews('fixture-person-mei', cursor);
      seen.push(...page.items.map((row) => row.id));
      cursor = page.nextCursor;
    } while (cursor);
    expect(seen).toHaveLength(128);
    expect(new Set(seen).size).toBe(128);
  });
});
