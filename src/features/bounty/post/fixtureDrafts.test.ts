import { describe, expect, test } from 'bun:test';

import { fixtureDraft } from './fixtureDrafts';
import { checkDraft, codePoints } from './validate';

const MORNING = new Date(2026, 9, 27, 9, 0);
const EVENING = new Date(2026, 9, 27, 19, 2);

describe('fixture drafts', () => {
  test('none and unknown names seed nothing', () => {
    expect(fixtureDraft('none', 'id', MORNING)).toBeNull();
    expect(fixtureDraft(undefined, 'id', MORNING)).toBeNull();
    expect(fixtureDraft('lots', 'id', MORNING)).toBeNull();
  });

  test('demo is the parcel errand due at 18:00 today', () => {
    const draft = fixtureDraft('demo', 'id', MORNING);
    expect(draft).toMatchObject({ title: '帮我取个快递', category: 'pickup', rewardText: '8' });
    expect(draft?.description?.startsWith('Shopee 包裹在 Sunway Geo 管理处')).toBe(true);
    expect(draft?.time).toEqual({
      kind: 'deadline',
      deadlineAt: new Date(2026, 9, 27, 18, 0).toISOString(),
    });
    expect(checkDraft(draft!, MORNING).ok).toBe(true);
  });

  test('after 18:00 the demo deadline is two hours ahead on a 5-minute step', () => {
    const draft = fixtureDraft('demo', 'id', EVENING);
    expect(draft?.time).toEqual({
      kind: 'deadline',
      deadlineAt: new Date(2026, 9, 27, 21, 5).toISOString(),
    });
    expect(checkDraft(draft!, EVENING).ok).toBe(true);
  });

  test('one is the smallest valid draft: RM 1 and no optional rows', () => {
    const draft = fixtureDraft('one', 'id', MORNING)!;
    expect(draft).toMatchObject({ rewardText: '1', description: null, time: { kind: 'none' } });
    const checked = checkDraft(draft, MORNING);
    expect(checked.ok && checked.args.reward_minor).toBe(100);
  });

  test('worst sits on every limit and still validates', () => {
    const draft = fixtureDraft('worst', 'id', MORNING)!;
    expect(codePoints(draft.title)).toBe(60);
    expect(draft.title).toMatch(/\p{Extended_Pictographic}/u);
    expect(draft.title).toMatch(/[a-z]/);
    expect(draft.title).toMatch(/\p{Script=Han}/u);
    expect(codePoints(draft.description ?? '')).toBe(500);
    expect(draft).toMatchObject({ category: 'other', rewardText: '500' });
    expect(draft.time.kind).toBe('window');
    if (draft.time.kind === 'window') {
      const start = new Date(draft.time.startsAt);
      const end = new Date(draft.time.endsAt);
      expect([start.getDay(), start.getHours(), start.getMinutes()]).toEqual([3, 23, 55]);
      expect(end.getDate()).not.toBe(start.getDate());
    }
    const checked = checkDraft(draft, MORNING);
    expect(checked.ok && checked.args.reward_minor).toBe(50000);
  });
});
