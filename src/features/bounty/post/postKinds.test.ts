import { describe, expect, test } from 'bun:test';

import { pickTime, rewardAmounts, rewardSuggestion, shownPicks } from './postKinds';

const local = (y: number, m: number, d: number, h: number, min = 0) =>
  new Date(y, m - 1, d, h, min);

describe('post kinds', () => {
  test('a tile category suggests its own range and amounts in RM only', () => {
    expect(rewardSuggestion('pickup', 'MYR')).toEqual([5, 8]);
    expect(rewardAmounts('pickup', 'MYR')).toEqual([5, 6, 8, 10]);
    expect(rewardSuggestion('pickup', 'CNY')).toBeNull();
    expect(rewardAmounts('pickup', 'CNY')).toEqual([10, 20, 30, 50]);
  });

  test('categories without a tile have no suggestion and general amounts', () => {
    expect(rewardSuggestion('handle', 'MYR')).toBeNull();
    expect(rewardSuggestion(null, 'MYR')).toBeNull();
    expect(rewardAmounts('other', 'MYR')).toEqual([5, 10, 15, 20]);
  });

  test('a relative pick lands on a five-minute step', () => {
    const now = local(2026, 10, 31, 15, 2);
    expect(pickTime({ id: 'withinHour', inMinutes: 60 }, now)).toEqual(local(2026, 10, 31, 16, 5));
  });

  test('a pick already past today is hidden, tomorrow stays', () => {
    const late = local(2026, 10, 31, 22, 30);
    expect(shownPicks('pickup', late).map((pick) => pick.id)).toEqual([
      'withinHour',
      'tomorrowNoon',
    ]);
    const early = local(2026, 10, 31, 9, 0);
    expect(shownPicks('pickup', early).map((pick) => pick.id)).toEqual([
      'withinHour',
      'tonight',
      'tomorrowNoon',
    ]);
  });

  test('the weekend pick is the coming Saturday, today on a Saturday morning', () => {
    const friday = local(2026, 10, 30, 10);
    expect(pickTime({ id: 'weekend', day: 'weekend', at: [12, 0] }, friday)).toEqual(
      local(2026, 10, 31, 12),
    );
    const saturday = local(2026, 10, 31, 9);
    expect(pickTime({ id: 'weekend', day: 'weekend', at: [12, 0] }, saturday)).toEqual(
      local(2026, 10, 31, 12),
    );
    const sunday = local(2026, 11, 1, 9);
    expect(pickTime({ id: 'weekend', day: 'weekend', at: [12, 0] }, sunday)).toEqual(
      local(2026, 11, 7, 12),
    );
  });
});
