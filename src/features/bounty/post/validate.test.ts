import { describe, expect, test } from 'bun:test';

import type { PostDraft } from './types';
import { checkDraft, codePoints, parseReward } from './validate';

const NOW = new Date('2026-10-27T04:00:00.000Z');
const HOUR = 3_600_000;
const at = (hours: number) => new Date(NOW.getTime() + hours * HOUR).toISOString();

const valid: PostDraft = {
  id: '6f1c2a40-5d3b-4c8e-9a7f-0b1d2e3f4a5b',
  title: '帮我取个快递',
  category: 'pickup',
  rewardText: '8',
  description: null,
  time: { kind: 'none' },
  place: null,
  updatedAt: NOW.toISOString(),
};

const errorOf = (patch: Partial<PostDraft>) => {
  const result = checkDraft({ ...valid, ...patch }, NOW);
  return result.ok ? null : result.error;
};

describe('codePoints', () => {
  test('counts code points, not UTF-16 units', () => {
    expect(codePoints('😀'.repeat(60))).toBe(60);
    expect('😀'.repeat(60).length).toBe(120);
    expect(codePoints('取快递')).toBe(3);
  });
});

describe('parseReward', () => {
  test.each([
    ['1', 100],
    ['8', 800],
    ['08', 800],
    ['500', 50000],
    ['５', 500],
    ['１２', 1200],
    [' 15 ', 1500],
  ])('%p → %p sen', (text, sen) => {
    expect(parseReward(text)).toBe(sen);
  });

  test.each(['', '0', '00', '501', '1.5', '-5', '5e2', 'RM5', '1 0', '١'])('%p → null', (text) => {
    expect(parseReward(text)).toBeNull();
  });
});

describe('checkDraft', () => {
  test('builds the exact RPC arguments', () => {
    expect(
      checkDraft(
        {
          ...valid,
          title: '  帮我取个快递 ',
          rewardText: '500',
          description: '  Shopee 包裹在管理处  ',
          time: { kind: 'window', startsAt: at(1), endsAt: at(3) },
          place: {
            label: ' Sunway Geo ',
            latitude: 3.0645,
            longitude: 101.6094,
            address: ' Tower B 管理处 ',
          },
        },
        NOW,
      ),
    ).toEqual({
      ok: true,
      args: {
        id: valid.id,
        title: '帮我取个快递',
        category: 'pickup',
        reward_sen: 50000,
        description: 'Shopee 包裹在管理处',
        place_label: 'Sunway Geo',
        latitude: 3.0645,
        longitude: 101.6094,
        address: 'Tower B 管理处',
        starts_at: '2026-10-27T05:00:00.000Z',
        ends_at: '2026-10-27T07:00:00.000Z',
        deadline_at: null,
      },
    });
  });

  test('absent optional fields are null', () => {
    expect(checkDraft({ ...valid, rewardText: '1' }, NOW)).toEqual({
      ok: true,
      args: {
        id: valid.id,
        title: '帮我取个快递',
        category: 'pickup',
        reward_sen: 100,
        description: null,
        place_label: null,
        latitude: null,
        longitude: null,
        address: null,
        starts_at: null,
        ends_at: null,
        deadline_at: null,
      },
    });
  });

  test('a deadline becomes deadline_at in ISO form', () => {
    const result = checkDraft(
      { ...valid, time: { kind: 'deadline', deadlineAt: '2026-10-27T18:00:00+08:00' } },
      NOW,
    );
    expect(result.ok && result.args).toMatchObject({
      starts_at: null,
      ends_at: null,
      deadline_at: '2026-10-27T10:00:00.000Z',
    });
  });

  test('title', () => {
    expect(errorOf({ title: '  ' })).toBe('titleEmpty');
    expect(errorOf({ title: '😀'.repeat(60) })).toBeNull();
    expect(errorOf({ title: `  ${'😀'.repeat(60)}  ` })).toBeNull();
    expect(errorOf({ title: '😀'.repeat(61) })).toBe('titleTooLong');
  });

  test('category', () => {
    expect(errorOf({ category: null })).toBe('categoryEmpty');
  });

  test('reward', () => {
    expect(errorOf({ rewardText: '' })).toBe('rewardEmpty');
    expect(errorOf({ rewardText: '  ' })).toBe('rewardEmpty');
    expect(errorOf({ rewardText: '0' })).toBe('rewardRange');
    expect(errorOf({ rewardText: '501' })).toBe('rewardRange');
    expect(errorOf({ rewardText: '1.5' })).toBe('rewardRange');
  });

  test('description', () => {
    expect(errorOf({ description: '说'.repeat(500) })).toBeNull();
    expect(errorOf({ description: '说'.repeat(501) })).toBe('descriptionTooLong');
    const blank = checkDraft({ ...valid, description: '   ' }, NOW);
    expect(blank.ok && blank.args.description).toBeNull();
  });

  test('place and address', () => {
    const place = { label: '地'.repeat(80), latitude: 3, longitude: 101, address: null };
    expect(errorOf({ place })).toBeNull();
    expect(errorOf({ place: { ...place, label: '地'.repeat(81) } })).toBe('placeTooLong');
    expect(errorOf({ place: { ...place, label: '  ' } })).toBe('placeEmpty');
    expect(errorOf({ place: { ...place, address: '址'.repeat(120) } })).toBeNull();
    expect(errorOf({ place: { ...place, address: '址'.repeat(121) } })).toBe('addressTooLong');
    const blank = checkDraft({ ...valid, place: { ...place, address: ' ' } }, NOW);
    expect(blank.ok && blank.args.address).toBeNull();
    // @ts-expect-error an address only exists inside a place
    const orphan: PostDraft = { ...valid, address: '管理处' };
    expect(orphan.place).toBeNull();
  });

  test('a place name counts code points after trimming, like the server', () => {
    const place = { label: ` ${'🏠'.repeat(80)} `, latitude: 3, longitude: 101, address: null };
    expect(errorOf({ place })).toBeNull();
    expect(errorOf({ place: { ...place, label: '🏠'.repeat(81) } })).toBe('placeTooLong');
    const sent = checkDraft({ ...valid, place: { ...place, label: ' Sunway Geo 宿舍 ' } }, NOW);
    expect(sent.ok && sent.args.place_label).toBe('Sunway Geo 宿舍');
  });

  test('deadline', () => {
    expect(errorOf({ time: { kind: 'deadline', deadlineAt: at(-1) } })).toBe('timePast');
    expect(errorOf({ time: { kind: 'deadline', deadlineAt: NOW.toISOString() } })).toBe('timePast');
    expect(errorOf({ time: { kind: 'deadline', deadlineAt: at(30 * 24) } })).toBeNull();
    expect(errorOf({ time: { kind: 'deadline', deadlineAt: at(30 * 24 + 1) } })).toBe('timeTooFar');
    expect(errorOf({ time: { kind: 'deadline', deadlineAt: 'not a date' } })).toBe('timePast');
  });

  test('window', () => {
    expect(errorOf({ time: { kind: 'window', startsAt: at(-1), endsAt: at(2) } })).toBe('timePast');
    expect(errorOf({ time: { kind: 'window', startsAt: at(30 * 24 + 1), endsAt: at(800) } })).toBe(
      'timeTooFar',
    );
    expect(errorOf({ time: { kind: 'window', startsAt: at(2), endsAt: at(2) } })).toBe(
      'windowOrder',
    );
    expect(errorOf({ time: { kind: 'window', startsAt: at(2), endsAt: at(1) } })).toBe(
      'windowOrder',
    );
    expect(errorOf({ time: { kind: 'window', startsAt: at(2), endsAt: 'bad' } })).toBe(
      'windowOrder',
    );
  });

  test('the first error in form order wins', () => {
    expect(errorOf({ title: '', category: null, rewardText: '' })).toBe('titleEmpty');
    expect(errorOf({ category: null, rewardText: '' })).toBe('categoryEmpty');
  });
});
