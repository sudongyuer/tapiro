import type { SupabaseClient } from '@supabase/supabase-js';

import {
  toMyMascot,
  toPendingReviews,
  toProfileCard,
  toReplied,
  toReviewPage,
  toReviewPair,
  toReviewPairs,
  toTierDrop,
} from './parse';
import {
  REVIEW_PAGE_SIZE,
  type AccessoryFailure,
  type ReplyFailure,
  type ReputationService,
  type SubmitFailure,
} from './types';

const SUBMIT_FAILURES: Readonly<Record<string, SubmitFailure>> = {
  review_closed: 'closed',
  review_locked: 'locked',
  invalid_review: 'invalid',
  review_not_found: 'notFound',
};

const REPLY_FAILURES: Readonly<Record<string, ReplyFailure>> = {
  already_replied: 'alreadyReplied',
  invalid_reply: 'invalid',
  review_not_found: 'notFound',
};

const errorCode = (error: unknown) => {
  const message = (error as { message?: unknown } | null)?.message;
  return typeof message === 'string' ? message : '';
};

const known = <T extends string>(table: Readonly<Record<string, T>>, error: unknown, other: T) =>
  Object.hasOwn(table, errorCode(error)) ? table[errorCode(error)] : other;

export const toSubmitFailure = (error: unknown) => known(SUBMIT_FAILURES, error, 'failed');
export const toReplyFailure = (error: unknown) => known(REPLY_FAILURES, error, 'failed');
export const toAccessoryFailure = (error: unknown): AccessoryFailure =>
  errorCode(error) === 'accessory_locked' ? 'locked' : 'failed';

export class AccessoryError extends Error {
  constructor(readonly failure: AccessoryFailure) {
    super(`accessory: ${failure}`);
  }
}

export class ProfileGoneError extends Error {
  constructor() {
    super('profile: user_not_found');
  }
}

function unwrap<T extends { data: unknown; error: unknown }>(result: T): T['data'] {
  if (result.error) throw result.error;
  return result.data;
}

export function createSupabaseReputationService(client: SupabaseClient | null): ReputationService {
  const db = () => {
    if (!client) throw new Error('Supabase is not configured');
    return client;
  };
  return {
    async reviewState(kind, itemId) {
      return toReviewPairs(unwrap(await db().rpc('review_state', { kind, item: itemId })));
    },
    async pendingReviews() {
      return toPendingReviews(unwrap(await db().rpc('pending_reviews')));
    },
    async submitReview({ kind, itemId, reviewee }, draft) {
      try {
        const { data, error } = await db().rpc('submit_review', {
          kind,
          item: itemId,
          reviewee,
          face: draft.face,
          chips: draft.chips,
          sentence: draft.sentence,
        });
        if (error) return { ok: false, failure: toSubmitFailure(error) };
        return { ok: true, pair: toReviewPair(data) };
      } catch {
        return { ok: false, failure: 'failed' };
      }
    },
    async reply(reviewId, body) {
      try {
        const { data, error } = await db().rpc('reply_to_review', { review: reviewId, body });
        if (error) return { ok: false, failure: toReplyFailure(error) };
        return { ok: true, ...toReplied(data) };
      } catch {
        return { ok: false, failure: 'failed' };
      }
    },
    async profile(personId) {
      const { data, error } = await db().rpc('profile_card', { person: personId });
      if (error && errorCode(error) === 'user_not_found') throw new ProfileGoneError();
      if (error) throw error;
      return toProfileCard(data);
    },
    async profileReviews(personId, before) {
      return toReviewPage(
        unwrap(
          await db().rpc('profile_reviews', {
            person: personId,
            before,
            max_count: REVIEW_PAGE_SIZE,
          }),
        ),
      );
    },
    async myMascot() {
      return toMyMascot(unwrap(await db().rpc('my_mascot')));
    },
    async markLevelSeen(level) {
      return toMyMascot(unwrap(await db().rpc('mark_level_seen', { level })));
    },
    async setAccessory(accessory) {
      const { data, error } = await db().rpc('set_mascot_accessory', { accessory });
      if (error) throw new AccessoryError(toAccessoryFailure(error));
      return toMyMascot(data);
    },
    async pendingTierDrop() {
      return toTierDrop(unwrap(await db().rpc('pending_tier_drop')));
    },
    async markTierDropSeen(id) {
      unwrap(await db().rpc('mark_tier_drop_seen', { seen: id }));
    },
    async reportPerson(personId, reason, note) {
      unwrap(await db().rpc('report', { target_user: personId, message: null, reason, note }));
    },
    async reportReview(reviewId, reason, note) {
      const { error } = await db().rpc('report', {
        target_user: null,
        message: null,
        reason,
        note,
        review: reviewId,
      });
      if (error && errorCode(error) === 'review_not_found') return 'gone';
      if (error) throw error;
      return 'sent';
    },
  };
}
