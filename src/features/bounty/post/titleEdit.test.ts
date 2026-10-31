import { describe, expect, test } from 'bun:test';

import { toDraft } from './draftStore';
import { pickPatch, titlePatch } from './titleEdit';
import type { PostDraft } from './types';

const blank: PostDraft = {
  id: 'id',
  title: '',
  category: null,
  categorySource: null,
  art: null,
  rewardText: '',
  currency: 'MYR',
  description: null,
  time: { kind: 'none' },
  place: null,
  updatedAt: '2026-10-31T00:00:00.000Z',
};

describe('category from the title', () => {
  test('直接写 guesses the category and marks it automatic', () => {
    expect(titlePatch(blank, '帮我办张电话卡')).toMatchObject({ title: '帮我办张电话卡' });
    expect(titlePatch(blank, '帮我取个快递')).toMatchObject({
      category: 'pickup',
      categorySource: 'auto',
    });
  });

  test('a guess that no longer matches is cleared', () => {
    const guessed = {
      ...blank,
      title: '取快递',
      category: 'pickup' as const,
      categorySource: 'auto' as const,
    };
    expect(titlePatch(guessed, '帮个忙')).toMatchObject({ category: null, categorySource: null });
  });

  test('a chosen category never follows the title', () => {
    const chosen = { ...blank, category: 'queue' as const, categorySource: 'chosen' as const };
    const patch = titlePatch(chosen, '帮我取个快递');
    expect(patch.category).toBeUndefined();
    expect(patch.categorySource).toBeUndefined();
  });

  test('a tile presets its art until the title says something else', () => {
    const picked = { ...blank, ...pickPatch('buy', '') };
    expect(picked).toMatchObject({ category: 'buy', categorySource: 'chosen', art: 'tea' });
    expect(titlePatch(picked, '帮我带个东西').art).toBeUndefined();
    expect(titlePatch(picked, '帮我买盒感冒药').art).toBeNull();
  });

  test('picking a tile after a meaningful title lets the title choose the art', () => {
    expect(pickPatch('buy', '帮我买盒感冒药').art).toBeNull();
  });

  test('older drafts load with a chosen category when they have one', () => {
    const stored = { ...blank, category: 'pickup' } as Record<string, unknown>;
    delete stored.categorySource;
    expect(toDraft(stored)?.categorySource).toBe('chosen');
    expect(toDraft({ ...stored, category: null })?.categorySource).toBeNull();
  });
});
