import { describe, expect, test } from 'bun:test';

import { BOUNTY_DRAFT_LIMITS, parseBountyDraft, toBountyFormPatch } from '@/lib/drafts/bountyDraft';

import type { PostDraft } from './types';
import { DESCRIPTION_MAX, PLACE_MAX, TIME_AHEAD_MS, TITLE_MAX, checkDraft } from './validate';

const NOW = new Date('2026-11-09T04:00:00.000Z');

const BLANK: PostDraft = {
  id: 'draft-1',
  title: '',
  category: null,
  categorySource: null,
  art: null,
  rewardText: '',
  currency: 'MYR',
  description: null,
  time: { kind: 'none' },
  place: null,
  updatedAt: NOW.toISOString(),
};

function formWith(raw: Record<string, unknown>, form: PostDraft = BLANK): PostDraft {
  const parsed = parseBountyDraft(raw);
  if (!parsed.ok) throw new Error(`rejected: ${JSON.stringify(parsed)}`);
  const fields: Partial<PostDraft> = toBountyFormPatch(parsed.draft, {
    now: NOW,
    currency: form.currency,
    categorySource: form.categorySource,
  }).fields;
  return { ...form, ...fields };
}

const DRAFT = {
  title: '帮取快递',
  category: 'pickup',
  rewardMajor: 8,
  currency: 'MYR',
  description: '放宿舍门口',
  deadlineAt: '2026-11-09T20:00:00+08:00',
  startsAt: null,
  endsAt: null,
  placeHint: null,
};

describe('a bounty draft in the post form', () => {
  test('the contract limits are the form limits', () => {
    expect(BOUNTY_DRAFT_LIMITS).toEqual({
      titleMax: TITLE_MAX,
      descriptionMax: DESCRIPTION_MAX,
      placeHintMax: PLACE_MAX,
      timeAheadMs: TIME_AHEAD_MS,
    });
  });

  test('a mapped draft passes the check the form runs before publishing', () => {
    const checked = checkDraft(formWith(DRAFT), NOW);
    expect(checked).toEqual({
      ok: true,
      args: {
        id: 'draft-1',
        title: '帮取快递',
        category: 'pickup',
        art: expect.anything(),
        reward_minor: 800,
        reward_currency: 'MYR',
        description: '放宿舍门口',
        place_label: null,
        latitude: null,
        longitude: null,
        address: null,
        starts_at: null,
        ends_at: null,
        deadline_at: '2026-11-09T12:00:00.000Z',
      },
    });
  });

  test.each([1, 500, 7])('a reward of %d the mapping keeps passes the form', (rewardMajor) => {
    expect(checkDraft(formWith({ ...DRAFT, rewardMajor }), NOW).ok).toBe(true);
  });

  test('a reward the mapping leaves out shows the form its own empty error, not a range error', () => {
    expect(checkDraft(formWith({ ...DRAFT, rewardMajor: 501 }), NOW)).toEqual({
      ok: false,
      error: 'rewardEmpty',
    });
  });

  test('on a filled form, a dropped reward leaves the older reward in place', () => {
    const form = { ...BLANK, rewardText: '8', title: '买奶茶' };
    expect(formWith({ ...DRAFT, rewardMajor: 600 }, form).rewardText).toBe('8');
  });

  test('a stale guessed category does not survive a new title', () => {
    const form: PostDraft = { ...BLANK, title: '买奶茶', category: 'buy', categorySource: 'auto' };
    expect(formWith({ ...DRAFT, category: null }, form).category).toBe('pickup');
  });

  test('a window the mapping keeps passes the form', () => {
    const checked = checkDraft(
      formWith({
        ...DRAFT,
        deadlineAt: null,
        startsAt: '2026-11-10T10:00:00Z',
        endsAt: '2026-11-10T11:00:00Z',
      }),
      NOW,
    );
    expect(checked.ok).toBe(true);
  });

  test('a draft with no category and no guess asks for one on the form', () => {
    expect(checkDraft(formWith({ ...DRAFT, title: 'xyz', category: null }), NOW)).toEqual({
      ok: false,
      error: 'categoryEmpty',
    });
  });
});
