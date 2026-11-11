import { describe, expect, test } from 'bun:test';

import { parseBountyDraft, type BountyDraft } from '@/lib/drafts/bountyDraft';

import { fillFromDraft, undoFill } from './aiFill';
import type { PostDraft } from './types';

const NOW = new Date('2026-11-12T04:00:00.000Z');

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

const RAW = {
  title: '帮取快递',
  category: 'pickup',
  rewardMajor: 15,
  currency: null,
  description: '放 Sunway Geo 大堂',
  deadlineAt: '2026-11-13T18:00:00+08:00',
  startsAt: null,
  endsAt: null,
  placeHint: 'Sunway Pyramid',
};

function draft(change: Record<string, unknown> = {}): BountyDraft {
  const parsed = parseBountyDraft({ ...RAW, ...change });
  if (!parsed.ok) throw new Error(JSON.stringify(parsed));
  return parsed.draft;
}

describe('filling the post form from a draft', () => {
  test('a blank form counts every row the draft fills', () => {
    const { patch, fill } = fillFromDraft(BLANK, draft(), NOW);
    expect(fill.rows).toEqual(['title', 'category', 'reward', 'time', 'description']);
    expect(patch).toMatchObject({ title: '帮取快递', rewardText: '15', category: 'pickup' });
    expect(fill.placeHint).toBe('Sunway Pyramid');
    expect(fill.dropped).toEqual([]);
  });

  test('a row that already held the same value is not counted', () => {
    const form = { ...BLANK, rewardText: '15', title: '帮取快递', art: null };
    const { fill } = fillFromDraft(form, draft(), NOW);
    expect(fill.rows).toEqual(['category', 'time', 'description']);
  });

  test('a reward the form refuses is named and the older reward stays', () => {
    const form = { ...BLANK, rewardText: '8' };
    const { patch, fill } = fillFromDraft(form, draft({ rewardMajor: 600 }), NOW);
    expect(fill.dropped).toEqual(['reward']);
    expect(fill.rows).not.toContain('reward');
    expect({ ...form, ...patch }.rewardText).toBe('8');
  });

  test('a time too far ahead is named and not filled', () => {
    const { fill } = fillFromDraft(BLANK, draft({ deadlineAt: '2027-01-30T18:00:00+08:00' }), NOW);
    expect(fill.dropped).toEqual(['time']);
    expect(fill.rows).not.toContain('time');
  });
});

describe('撤销', () => {
  test('puts every filled row back', () => {
    const form = { ...BLANK, title: '买奶茶', description: '少冰' };
    const { patch, fill } = fillFromDraft(form, draft(), NOW);
    const filled = { ...form, ...patch };
    expect({ ...filled, ...undoFill(filled, fill) }).toEqual(form);
  });

  test('keeps a row the user changed after the fill', () => {
    const { patch, fill } = fillFromDraft(BLANK, draft(), NOW);
    const edited = { ...BLANK, ...patch, rewardText: '20' };
    const undone = { ...edited, ...undoFill(edited, fill) };
    expect(undone.rewardText).toBe('20');
    expect(undone.title).toBe('');
    expect(undone.time).toEqual({ kind: 'none' });
  });

  test('does nothing on another draft', () => {
    const { patch, fill } = fillFromDraft(BLANK, draft(), NOW);
    expect(undoFill({ ...BLANK, ...patch, id: 'draft-2' }, fill)).toEqual({});
  });
});
