import { describe, expect, test } from 'bun:test';

import { checkSentDraft } from './sentDraft';
import type { PostDraft } from './types';

const DRAFT: PostDraft = {
  id: 'draft-1',
  title: '帮我取个快递',
  category: 'pickup',
  rewardText: '8',
  description: null,
  time: { kind: 'none' },
  place: null,
  updatedAt: '2026-10-27T09:00:00.000Z',
};

function run(overrides: Partial<Parameters<typeof checkSentDraft>[0]> = {}) {
  const log: string[] = [];
  return checkSentDraft({
    draft: DRAFT,
    isEmpty: () => false,
    isPublished: async (id) => {
      log.push(`asked:${id}`);
      return true;
    },
    stillCurrent: () => true,
    onSent: () => log.push('sent'),
    ...overrides,
  }).then(() => log);
}

describe('a draft that was already published', () => {
  test('is reported when its id is already one of the user’s bounties', async () => {
    expect(await run()).toEqual(['asked:draft-1', 'sent']);
  });

  test('an unpublished draft stays', async () => {
    expect(await run({ isPublished: async () => false })).toEqual([]);
  });

  test('an empty draft is not checked', async () => {
    expect(await run({ isEmpty: () => true })).toEqual([]);
  });

  test('a failed check keeps the draft', async () => {
    const log = await run({
      isPublished: async () => {
        throw new TypeError('Network request failed');
      },
    });
    expect(log).toEqual([]);
  });

  test('a draft replaced while the check ran is left alone', async () => {
    expect(await run({ stillCurrent: () => false })).toEqual(['asked:draft-1']);
  });
});
