import { describe, expect, test } from 'bun:test';

import { parseBountyDraft, toBountyFormPatch, type BountyDraft } from './bountyDraft';

const FULL = {
  title: ' 帮取快递 ',
  category: 'pickup',
  rewardMajor: 8,
  currency: 'CNY',
  description: '放宿舍门口',
  deadlineAt: '2026-11-09T20:00:00+08:00',
  startsAt: null,
  endsAt: null,
  placeHint: 'Sunway Geo',
};

const NOW = new Date('2026-11-09T04:00:00.000Z');
const FORM = { now: NOW, currency: 'MYR' as const, categorySource: null };

function parsed(value: unknown): BountyDraft {
  const result = parseBountyDraft(value);
  if (!result.ok) throw new Error(`rejected: ${JSON.stringify(result)}`);
  return result.draft;
}

describe('parseBountyDraft', () => {
  test('a complete draft parses with its title trimmed and its time nested', () => {
    expect(parsed(FULL)).toEqual({
      title: '帮取快递',
      category: 'pickup',
      rewardMajor: 8,
      currency: 'CNY',
      description: '放宿舍门口',
      time: { kind: 'deadline', deadlineAt: '2026-11-09T20:00:00+08:00' },
      placeHint: 'Sunway Geo',
    });
  });

  test('every optional field may be null', () => {
    expect(
      parsed({
        title: '帮忙',
        category: null,
        rewardMajor: null,
        currency: null,
        description: null,
        deadlineAt: null,
        startsAt: null,
        endsAt: null,
        placeHint: null,
      }),
    ).toEqual({
      title: '帮忙',
      category: null,
      rewardMajor: null,
      currency: null,
      description: null,
      time: { kind: 'none' },
      placeHint: null,
    });
  });

  test('a window parses when it ends after it starts', () => {
    const draft = parsed({
      ...FULL,
      deadlineAt: null,
      startsAt: '2026-11-10T10:00:00Z',
      endsAt: '2026-11-10T11:00:00Z',
    });
    expect(draft.time).toEqual({
      kind: 'window',
      startsAt: '2026-11-10T10:00:00Z',
      endsAt: '2026-11-10T11:00:00Z',
    });
  });

  test('an unknown field rejects the draft and names the field', () => {
    expect(parseBountyDraft({ ...FULL, publish: true })).toEqual({
      ok: false,
      reason: 'unknown_field',
      field: 'publish',
    });
  });

  test('a missing field rejects the draft and names the field', () => {
    const { placeHint: _dropped, ...rest } = FULL;
    expect(parseBountyDraft(rest)).toEqual({
      ok: false,
      reason: 'missing_field',
      field: 'placeHint',
    });
  });

  test('a value that is not an object is not a draft', () => {
    for (const value of [null, 'draft', 3, []]) {
      expect(parseBountyDraft(value)).toEqual({ ok: false, reason: 'not_object' });
    }
  });

  const INVALID: [string, Record<string, unknown>, string][] = [
    ['an empty title', { title: '   ' }, 'title'],
    ['a title past the limit in code points', { title: '😀'.repeat(61) }, 'title'],
    ['a category the form does not have', { category: 'massage' }, 'category'],
    ['a fractional reward', { rewardMajor: 5.5 }, 'rewardMajor'],
    ['a zero reward', { rewardMajor: 0 }, 'rewardMajor'],
    ['a reward sent as text', { rewardMajor: '8' }, 'rewardMajor'],
    ['an unknown currency', { currency: 'USD' }, 'currency'],
    ['a blank description', { description: ' ' }, 'description'],
    ['a description past the limit', { description: 'x'.repeat(501) }, 'description'],
    ['a place hint past the limit', { placeHint: 'x'.repeat(81) }, 'placeHint'],
    ['a time without an offset', { deadlineAt: '2026-11-09T20:00:00' }, 'deadlineAt'],
    ['a time that is not a date', { deadlineAt: '今晚' }, 'deadlineAt'],
    ['a day that does not exist', { deadlineAt: '2026-11-31T10:00:00+08:00' }, 'deadlineAt'],
    ['a deadline with a start as well', { startsAt: '2026-11-10T10:00:00Z' }, 'startsAt'],
    ['a deadline with an end as well', { endsAt: '2026-11-10T10:00:00Z' }, 'endsAt'],
    ['a start with no end', { deadlineAt: null, startsAt: '2026-11-10T10:00:00Z' }, 'endsAt'],
    ['an end with no start', { deadlineAt: null, endsAt: '2026-11-10T10:00:00Z' }, 'startsAt'],
    [
      'a window that ends before it starts',
      { deadlineAt: null, startsAt: '2026-11-10T11:00:00Z', endsAt: '2026-11-10T10:00:00Z' },
      'endsAt',
    ],
  ];

  test.each(INVALID)('%s is rejected', (_name, change, field) => {
    expect(parseBountyDraft({ ...FULL, ...change })).toEqual({
      ok: false,
      reason: 'invalid_field',
      field,
    });
  });

  test('a title of exactly the limit in code points parses', () => {
    expect(parsed({ ...FULL, title: '😀'.repeat(60) }).title).toBe('😀'.repeat(60));
  });
});

describe('toBountyFormPatch', () => {
  test('maps a complete draft to the form fields and keeps the place as a hint', () => {
    expect(toBountyFormPatch(parsed(FULL), FORM)).toEqual({
      fields: {
        title: '帮取快递',
        art: null,
        category: 'pickup',
        categorySource: 'auto',
        rewardText: '8',
        currency: 'CNY',
        description: '放宿舍门口',
        time: { kind: 'deadline', deadlineAt: '2026-11-09T20:00:00+08:00' },
      },
      placeHint: 'Sunway Geo',
      dropped: [],
    });
  });

  test('a field the draft leaves null is not touched', () => {
    const draft = parsed({
      ...FULL,
      category: null,
      rewardMajor: null,
      currency: null,
      description: null,
      deadlineAt: null,
      placeHint: null,
    });
    expect(toBountyFormPatch(draft, { ...FORM, categorySource: 'chosen' })).toEqual({
      fields: { title: '帮取快递', art: null },
      placeHint: null,
      dropped: [],
    });
  });

  test('a draft with no category guesses again over a guessed category', () => {
    const noCategory = { ...FULL, category: null };
    const parcel = toBountyFormPatch(parsed(noCategory), { ...FORM, categorySource: 'auto' });
    expect(parcel.fields.category).toBe('pickup');
    expect(parcel.fields.categorySource).toBe('auto');
    const vague = toBountyFormPatch(parsed({ ...noCategory, title: 'xyz' }), {
      ...FORM,
      categorySource: 'auto',
    });
    expect(vague.fields.category).toBeNull();
    expect(vague.fields.categorySource).toBeNull();
  });

  test('a draft with no category leaves a chosen category alone', () => {
    const chosen = toBountyFormPatch(parsed({ ...FULL, category: null }), {
      ...FORM,
      categorySource: 'chosen',
    }).fields;
    expect('category' in chosen).toBe(false);
    expect('categorySource' in chosen).toBe(false);
  });

  test('a reward without a currency is checked against the form currency and leaves it alone', () => {
    const inMyr = toBountyFormPatch(
      parsed({ ...FULL, currency: null, rewardMajor: 500 }),
      FORM,
    ).fields;
    expect(inMyr.rewardText).toBe('500');
    expect(inMyr.currency).toBeUndefined();
    const inCny = toBountyFormPatch(parsed({ ...FULL, currency: null, rewardMajor: 800 }), {
      ...FORM,
      currency: 'CNY',
    }).fields;
    expect(inCny.rewardText).toBe('800');
  });

  test('a reward the form would refuse is left out, with its currency', () => {
    const over = toBountyFormPatch(parsed({ ...FULL, currency: 'MYR', rewardMajor: 501 }), FORM);
    expect(over.fields.rewardText).toBeUndefined();
    expect(over.fields.currency).toBeUndefined();
    expect(over.fields.title).toBe('帮取快递');
    expect(over.dropped).toEqual(['reward']);
  });

  test('a currency with no reward does not change the form', () => {
    const fields = toBountyFormPatch(parsed({ ...FULL, rewardMajor: null }), FORM).fields;
    expect(fields.currency).toBeUndefined();
  });

  test('a past time is left out', () => {
    const patch = toBountyFormPatch(parsed({ ...FULL, deadlineAt: '2026-11-09T03:59:00Z' }), FORM);
    expect(patch.fields.time).toBeUndefined();
    expect(patch.dropped).toEqual(['time']);
  });

  test('a time more than 30 days ahead is left out, and exactly 30 days stays', () => {
    const atLimit = toBountyFormPatch(
      parsed({ ...FULL, deadlineAt: '2026-12-09T04:00:00Z' }),
      FORM,
    ).fields;
    expect(atLimit.time).toEqual({ kind: 'deadline', deadlineAt: '2026-12-09T04:00:00Z' });
    const past = toBountyFormPatch(
      parsed({ ...FULL, deadlineAt: '2026-12-09T04:00:01Z' }),
      FORM,
    ).fields;
    expect(past.time).toBeUndefined();
  });

  test('a window is judged by its start', () => {
    const fields = toBountyFormPatch(
      parsed({
        ...FULL,
        deadlineAt: null,
        startsAt: '2026-11-09T03:00:00Z',
        endsAt: '2026-11-09T05:00:00Z',
      }),
      FORM,
    ).fields;
    expect(fields.time).toBeUndefined();
  });
});
