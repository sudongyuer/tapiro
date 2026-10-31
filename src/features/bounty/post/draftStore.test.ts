import { describe, expect, test } from 'bun:test';

import { createDraftStore, type DraftStorage } from './draftStore';
import type { PostDraft } from './types';

function memoryStorage(initial: Record<string, unknown> = {}) {
  const values = new Map(Object.entries(initial));
  const writes: string[] = [];
  const storage: DraftStorage = {
    read: (userId) => values.get(userId),
    write(userId, draft) {
      writes.push(userId);
      if (draft === null) values.delete(userId);
      else values.set(userId, JSON.parse(JSON.stringify(draft)));
    },
  };
  return { storage, values, writes };
}

function ids() {
  let next = 0;
  return () => `draft-${(next += 1)}`;
}

const NOW = new Date('2026-10-27T04:00:00.000Z');
const store = (storage: DraftStorage, newId = ids()) => createDraftStore(storage, newId, () => NOW);

describe('draft store', () => {
  test('load on nothing returns an empty draft with a new id and does not write', () => {
    const memory = memoryStorage();
    const drafts = store(memory.storage);
    const draft = drafts.load('a');
    expect(draft).toEqual({
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
    });
    expect(drafts.isEmpty(draft)).toBe(true);
    expect(memory.writes).toEqual([]);
    expect(drafts.load('a').id).toBe('draft-1');
  });

  test('update writes at once and survives a restart', () => {
    const memory = memoryStorage();
    const first = store(memory.storage);
    first.load('a');
    first.update('a', { title: '帮我取个快递', rewardText: '8' });
    expect(memory.writes).toEqual(['a']);
    expect(memory.values.get('a')).toMatchObject({ id: 'draft-1', title: '帮我取个快递' });

    const restarted = store(memory.storage, () => 'other-id');
    expect(restarted.load('a')).toMatchObject({
      id: 'draft-1',
      title: '帮我取个快递',
      rewardText: '8',
    });
  });

  test('update without a load still keeps one id', () => {
    const memory = memoryStorage();
    const drafts = store(memory.storage);
    drafts.update('a', { title: 'x' });
    drafts.update('a', { rewardText: '5' });
    expect(drafts.load('a')).toMatchObject({ id: 'draft-1', title: 'x', rewardText: '5' });
  });

  test('the id stays across updates and a failed publish', () => {
    const memory = memoryStorage();
    const drafts = store(memory.storage);
    const { id } = drafts.load('a');
    drafts.update('a', { title: '帮我取个快递' });
    drafts.update('a', { category: 'pickup', id: 'sneaky' } as Partial<PostDraft>);
    expect(drafts.load('a').id).toBe(id);
    expect(store(memory.storage, () => 'later').load('a').id).toBe(id);
  });

  test('clear removes the draft and the next load has a new id', () => {
    const memory = memoryStorage();
    const drafts = store(memory.storage);
    drafts.update('a', { title: '帮我取个快递' });
    drafts.clear('a');
    expect(memory.values.has('a')).toBe(false);
    const next = drafts.load('a');
    expect(next.id).toBe('draft-2');
    expect(next.title).toBe('');
  });

  test('a new draft takes the default currency; reset keeps the last choice, clear forgets it', () => {
    const memory = memoryStorage();
    let region: 'MYR' | 'CNY' = 'CNY';
    const drafts = createDraftStore(
      memory.storage,
      ids(),
      () => NOW,
      () => region,
    );
    expect(drafts.load('a').currency).toBe('CNY');
    region = 'MYR';
    drafts.update('a', { title: '帮我取个快递', rewardText: '50', currency: 'CNY' });
    drafts.reset('a');
    const fresh = drafts.load('a');
    expect(fresh).toMatchObject({ id: 'draft-2', title: '', rewardText: '', currency: 'CNY' });
    expect(drafts.isEmpty(fresh)).toBe(true);
    expect(
      createDraftStore(
        memory.storage,
        ids(),
        () => NOW,
        () => region,
      ).load('a'),
    ).toMatchObject({ id: 'draft-2', currency: 'CNY' });
    drafts.clear('a');
    expect(drafts.load('a').currency).toBe('MYR');
  });

  test('a stored draft from before currencies takes the default currency', () => {
    const memory = memoryStorage({
      a: {
        id: 'old',
        title: '取快递',
        category: 'pickup',
        rewardText: '8',
        description: null,
        time: { kind: 'none' },
        place: null,
        updatedAt: NOW.toISOString(),
      },
    });
    const drafts = createDraftStore(
      memory.storage,
      ids(),
      () => NOW,
      () => 'CNY',
    );
    expect(drafts.load('a')).toMatchObject({ id: 'old', rewardText: '8', currency: 'CNY' });
  });

  test('drafts are per user', () => {
    const memory = memoryStorage();
    const drafts = store(memory.storage);
    drafts.update('a', { title: 'A 的草稿' });
    expect(drafts.load('b').title).toBe('');
    drafts.update('b', { title: 'B 的草稿' });
    expect(drafts.load('a').title).toBe('A 的草稿');
    expect(store(memory.storage).load('b').title).toBe('B 的草稿');
  });

  test.each([
    ['a string', 'not a draft'],
    ['wrong shape', { id: 'x', title: 3 }],
    [
      'unknown category',
      {
        id: 'x',
        title: 't',
        category: 'parcel',
        rewardText: '',
        description: null,
        time: { kind: 'none' },
        place: null,
        updatedAt: '2026-10-27T00:00:00Z',
      },
    ],
    [
      'broken time',
      {
        id: 'x',
        title: 't',
        category: null,
        rewardText: '',
        description: null,
        time: { kind: 'window', startsAt: '2026-10-28T00:00:00Z' },
        place: null,
        updatedAt: '2026-10-27T00:00:00Z',
      },
    ],
    [
      'address without coordinates',
      {
        id: 'x',
        title: 't',
        category: null,
        rewardText: '',
        description: null,
        time: { kind: 'none' },
        place: { label: 'Sunway', address: 'B-12' },
        updatedAt: '2026-10-27T00:00:00Z',
      },
    ],
  ])('a corrupt value (%s) becomes an empty draft', (_, stored) => {
    const drafts = store(memoryStorage({ a: stored }).storage);
    const draft = drafts.load('a');
    expect(draft.id).toBe('draft-1');
    expect(drafts.isEmpty(draft)).toBe(true);
  });

  test('a storage that throws on read gives an empty draft', () => {
    const drafts = store({
      read: () => {
        throw new Error('unreadable');
      },
      write: () => {},
    });
    expect(drafts.load('a').title).toBe('');
  });

  test('a complete stored draft round-trips', () => {
    const full: PostDraft = {
      id: 'kept',
      title: '帮我取个快递',
      category: 'pickup',
      categorySource: 'chosen',
      art: null,
      rewardText: '8',
      currency: 'CNY',
      description: '在管理处',
      time: { kind: 'window', startsAt: '2026-10-28T01:00:00Z', endsAt: '2026-10-28T03:00:00Z' },
      place: { label: 'Sunway Geo', latitude: 3.06, longitude: 101.6, address: null },
      updatedAt: '2026-10-27T00:00:00Z',
    };
    expect(store(memoryStorage({ a: full }).storage).load('a')).toEqual(full);
  });

  test('isEmpty is true only when every field is blank', () => {
    const drafts = store(memoryStorage().storage);
    const empty = drafts.load('a');
    expect(drafts.isEmpty({ ...empty, title: '  ', rewardText: ' ', description: '' })).toBe(true);
    for (const patch of [
      { title: 'x' },
      { category: 'other' },
      { rewardText: '5' },
      { description: '说明' },
      { time: { kind: 'deadline', deadlineAt: '2026-10-28T00:00:00Z' } },
      { place: { label: 'Sunway', latitude: 3, longitude: 101, address: null } },
    ] as Partial<PostDraft>[]) {
      expect(drafts.isEmpty({ ...empty, ...patch })).toBe(false);
    }
  });

  test('loading tells no subscriber, so it is safe inside a render', () => {
    const drafts = store(memoryStorage().storage);
    let heard = 0;
    drafts.subscribe(() => {
      heard += 1;
    });
    const first = drafts.load('a');
    expect(drafts.load('a')).toBe(first);
    expect(drafts.getSnapshot()).toBe(first);
    expect(heard).toBe(0);
  });

  test('subscribers hear updates and clears; the snapshot follows', () => {
    const drafts = store(memoryStorage().storage);
    let heard = 0;
    const unsubscribe = drafts.subscribe(() => {
      heard += 1;
    });
    expect(drafts.getSnapshot()).toBeNull();
    drafts.load('a');
    drafts.update('a', { title: 'x' });
    expect(drafts.getSnapshot()?.title).toBe('x');
    drafts.clear('a');
    expect(drafts.getSnapshot()).toBeNull();
    const heardBefore = heard;
    expect(heardBefore).toBeGreaterThanOrEqual(2);
    unsubscribe();
    drafts.update('a', { title: 'y' });
    expect(heard).toBe(heardBefore);
  });
});
