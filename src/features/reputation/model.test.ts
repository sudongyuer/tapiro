import { describe, expect, test } from 'bun:test';

import {
  accessoryLevel,
  canReview,
  chipsFor,
  cleanText,
  daysLeft,
  draftChanged,
  EMPTY_DRAFT,
  levelNameKey,
  levelStartsAt,
  mascotLevel,
  pickFace,
  textFits,
  toggleChip,
  unlockedAccessories,
  validDraft,
} from './model';
import { CHIPS, ROLES, type ReviewPair } from './types';

describe('mascot level curve', () => {
  test('3, 8, 15 and 25 stickers reach levels 2 to 5, then every 15 more is a level', () => {
    const cases: [number, number][] = [
      [0, 1],
      [2, 1],
      [3, 2],
      [7, 2],
      [8, 3],
      [14, 3],
      [15, 4],
      [24, 4],
      [25, 5],
      [39, 5],
      [40, 6],
      [54, 6],
      [55, 7],
      [1234, 5 + Math.floor((1234 - 25) / 15)],
    ];
    for (const [stickers, level] of cases)
      expect([stickers, mascotLevel(stickers)]).toEqual([stickers, level]);
  });

  test('each level starts at the sticker count that reaches it', () => {
    for (let level = 1; level <= 30; level += 1) {
      const start = levelStartsAt(level);
      expect(mascotLevel(start)).toBe(level);
      if (start > 0) expect(mascotLevel(start - 1)).toBe(level - 1);
    }
  });

  test('levels 2 to 5 unlock one accessory each and later levels add none', () => {
    expect(unlockedAccessories(1)).toEqual([]);
    expect(unlockedAccessories(2)).toEqual(['red_hat']);
    expect(unlockedAccessories(4)).toEqual(['red_hat', 'backpack', 'umbrella']);
    expect(unlockedAccessories(9)).toEqual(['red_hat', 'backpack', 'umbrella', 'scarf']);
    expect(accessoryLevel('scarf')).toBe(5);
  });

  test('levels 1 to 5 have names and later levels share the grown name', () => {
    expect(levelNameKey(1)).toBe('reputation.level.lv1');
    expect(levelNameKey(5)).toBe('reputation.level.lv5');
    expect(levelNameKey(6)).toBe('reputation.level.grown');
    expect(levelNameKey(82)).toBe('reputation.level.grown');
  });
});

describe('review draft', () => {
  test('happy offers the good chips and the other faces the not-good ones, per role', () => {
    for (const role of ROLES) {
      expect(chipsFor(role, 'happy')).toEqual(CHIPS[role].good);
      expect(chipsFor(role, 'okay')).toEqual(CHIPS[role].notGood);
      expect(chipsFor(role, 'unhappy')).toEqual(CHIPS[role].notGood);
    }
  });

  test('changing the face drops the chips the new face does not offer', () => {
    const happy = toggleChip(pickFace(EMPTY_DRAFT, 'helper', 'happy'), 'helper', 'on_time');
    expect(happy.chips).toEqual(['on_time']);
    expect(pickFace(happy, 'helper', 'unhappy').chips).toEqual([]);
    const okay = toggleChip(pickFace(EMPTY_DRAFT, 'rider', 'okay'), 'rider', 'late');
    expect(pickFace(okay, 'rider', 'unhappy').chips).toEqual(['late']);
  });

  test('a chip outside the face or before a face is ignored, and a picked chip toggles off', () => {
    expect(toggleChip(EMPTY_DRAFT, 'helper', 'on_time')).toBe(EMPTY_DRAFT);
    let draft = pickFace(EMPTY_DRAFT, 'helper', 'okay');
    expect(toggleChip(draft, 'helper', 'on_time')).toBe(draft);
    for (const chip of CHIPS.helper.notGood) draft = toggleChip(draft, 'helper', chip);
    expect(draft.chips).toHaveLength(4);
    draft = toggleChip(draft, 'helper', 'late');
    expect(draft.chips).toEqual(['no_heads_up', 'unfinished', 'item_damaged']);
  });

  test('a valid draft needs a face, fitting chips and at most 200 characters after the trim', () => {
    expect(validDraft(EMPTY_DRAFT, 'helper')).toBeNull();
    expect(validDraft({ face: 'happy', chips: ['late'], sentence: '' }, 'helper')).toBeNull();
    expect(validDraft({ face: 'happy', chips: ['fair_split'], sentence: '' }, 'helper')).toBeNull();
    expect(
      validDraft({ face: 'happy', chips: ['on_time', 'on_time'], sentence: '' }, 'helper'),
    ).toBeNull();
    expect(
      validDraft({ face: 'unhappy', chips: [], sentence: '好'.repeat(201) }, 'poster'),
    ).toBeNull();
    expect(
      validDraft({ face: 'unhappy', chips: [], sentence: ` ${'好'.repeat(200)}​ ` }, 'poster'),
    ).toEqual({ face: 'unhappy', chips: [], sentence: '好'.repeat(200) });
    expect(validDraft({ face: 'okay', chips: ['late'], sentence: '  ' }, 'rider')).toEqual({
      face: 'okay',
      chips: ['late'],
      sentence: null,
    });
  });

  test('emoji count as one character each', () => {
    expect(textFits('😀'.repeat(200))).toBe(true);
    expect(textFits('😀'.repeat(201))).toBe(false);
    expect(cleanText('﻿ 谢谢 ​')).toBe('谢谢');
  });

  test('a draft is changed only when the face, a chip or the trimmed sentence differs', () => {
    const stored = { face: 'happy' as const, chips: ['on_time', 'careful'], sentence: '谢谢' };
    expect(
      draftChanged({ ...stored, chips: ['careful', 'on_time'], sentence: ' 谢谢 ' }, stored),
    ).toBe(false);
    expect(draftChanged({ ...stored, chips: ['careful'] }, stored)).toBe(true);
    expect(draftChanged({ ...stored, face: 'okay' }, stored)).toBe(true);
  });
});

describe('review pair', () => {
  const pair = (overrides: Partial<ReviewPair>): ReviewPair => ({
    kind: 'bounty',
    itemId: 'b1',
    counterpart: { id: 'p1', name: '小林', avatarUrl: null },
    role: 'helper',
    closesAt: '2026-11-10T00:00:00Z',
    state: 'open',
    theyReviewed: false,
    mine: null,
    theirs: null,
    ...overrides,
  });

  test('an open pair and an editable sealed review can be reviewed; revealed and ended cannot', () => {
    expect(canReview(pair({}))).toBe(true);
    const mine = {
      id: 'r1',
      face: 'happy' as const,
      chips: [],
      sentence: null,
      submittedAt: '2026-11-06T00:00:00Z',
      shownAt: null,
      reply: null,
      editable: true,
    };
    expect(canReview(pair({ state: 'sealed', mine }))).toBe(true);
    expect(canReview(pair({ state: 'sealed', mine: { ...mine, editable: false } }))).toBe(false);
    expect(canReview(pair({ state: 'revealed', mine }))).toBe(false);
    expect(canReview(pair({ state: 'ended' }))).toBe(false);
  });

  test('days left round up and never go below zero', () => {
    const now = new Date('2026-11-06T00:00:00Z');
    expect(daysLeft('2026-11-13T00:00:00Z', now)).toBe(7);
    expect(daysLeft('2026-11-06T00:00:01Z', now)).toBe(1);
    expect(daysLeft('2026-11-05T00:00:00Z', now)).toBe(0);
  });
});
