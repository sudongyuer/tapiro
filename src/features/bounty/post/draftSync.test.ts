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

const TYPED = { title: 'Parce', rewardText: '8', description: '', placeLabel: '', address: '' };
const PLACE = { label: 'Sunway Geo', latitude: 3.0657, longitude: 101.611, address: null };

describe('reading typed text back into the draft', () => {
  test('a missed last keystroke is written', () => {
    expect(typedPatch(STORED, 'draft-1', { ...TYPED, title: 'Parcel' })).toEqual({
      title: 'Parcel',
      rewardText: '8',
      description: null,
      place: null,
    });
  });

  test('nothing changed writes nothing', () => {
    expect(typedPatch(STORED, 'draft-1', TYPED)).toBeNull();
  });

  test('a description row that is not open stays closed', () => {
    const patch = typedPatch(STORED, 'draft-1', {
      ...TYPED,
      rewardText: '9',
      description: 'left over',
    });
    expect(patch?.description).toBeNull();
  });

  test('a form for a draft that was already cleared writes nothing into the new one', () => {
    expect(
      typedPatch({ ...STORED, id: 'draft-2', title: '' }, 'draft-1', { ...TYPED, title: 'Parcel' }),
    ).toBeNull();
  });

  test('a missed keystroke in the place name and address is written', () => {
    const patch = typedPatch({ ...STORED, place: PLACE }, 'draft-1', {
      ...TYPED,
      placeLabel: 'Sunway Geo 宿舍',
      address: 'A-12-03',
    });
    expect(patch?.place).toEqual({ ...PLACE, label: 'Sunway Geo 宿舍', address: 'A-12-03' });
  });

  test('an untouched place writes nothing, and an emptied address is stored as none', () => {
    const stored = { ...STORED, place: { ...PLACE, address: 'A-12-03' } };
    expect(
      typedPatch(stored, 'draft-1', { ...TYPED, placeLabel: 'Sunway Geo', address: 'A-12-03' }),
    ).toBeNull();
    expect(
      typedPatch(stored, 'draft-1', { ...TYPED, placeLabel: 'Sunway Geo', address: '' })?.place,
    ).toEqual(PLACE);
  });

  test('typed place text without a place adds no place', () => {
    expect(typedPatch(STORED, 'draft-1', { ...TYPED, placeLabel: 'left over' })).toBeNull();
  });
});
