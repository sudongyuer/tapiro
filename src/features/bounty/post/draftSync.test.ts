import { describe, expect, test } from 'bun:test';

import { typedPatch } from './draftSync';
import type { PostDraft } from './types';

const STORED: PostDraft = {
  id: 'draft-1',
  title: 'Parce',
  category: 'pickup',
  rewardText: '8',
  description: null,
  time: { kind: 'none' },
  place: null,
  updatedAt: '2026-10-27T09:00:00.000Z',
};

describe('reading typed text back into the draft', () => {
  test('a missed last keystroke is written', () => {
    expect(
      typedPatch(STORED, 'draft-1', { title: 'Parcel', rewardText: '8', description: '' }),
    ).toEqual({ title: 'Parcel', rewardText: '8', description: null });
  });

  test('nothing changed writes nothing', () => {
    expect(
      typedPatch(STORED, 'draft-1', { title: 'Parce', rewardText: '8', description: '' }),
    ).toBeNull();
  });

  test('a description row that is not open stays closed', () => {
    const patch = typedPatch(STORED, 'draft-1', {
      title: 'Parce',
      rewardText: '9',
      description: 'left over',
    });
    expect(patch?.description).toBeNull();
  });

  test('a form for a draft that was already cleared writes nothing into the new one', () => {
    expect(
      typedPatch({ ...STORED, id: 'draft-2', title: '' }, 'draft-1', {
        title: 'Parcel',
        rewardText: '8',
        description: '',
      }),
    ).toBeNull();
  });
});
