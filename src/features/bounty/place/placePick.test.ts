import { describe, expect, test } from 'bun:test';

import { createPlacePick } from './placePick';

const GEO = { name: 'Sunway Geo Residences', latitude: 3.0657, longitude: 101.611, address: null };
const PYRAMID = { name: 'Sunway Pyramid', latitude: 3.0733, longitude: 101.6078, address: null };

describe('handing a picked place back', () => {
  test('a pick is taken once', () => {
    const pick = createPlacePick();
    pick.set('post', GEO);
    expect(pick.take('post')).toEqual(GEO);
    expect(pick.take('post')).toBeNull();
  });

  test('nothing picked takes nothing', () => {
    expect(createPlacePick().take('post')).toBeNull();
  });

  test('a later pick replaces an untaken one', () => {
    const pick = createPlacePick();
    pick.set('post', GEO);
    pick.set('post', PYRAMID);
    expect(pick.take('post')).toEqual(PYRAMID);
  });

  test('the board and the post form do not take each other’s pick', () => {
    const pick = createPlacePick();
    pick.set('board', GEO);
    expect(pick.take('post')).toBeNull();
    expect(pick.take('board')).toEqual(GEO);
  });

  test('signing out clears both purposes', () => {
    const pick = createPlacePick();
    pick.set('post', GEO);
    pick.set('board', PYRAMID);
    pick.clear();
    expect(pick.take('post')).toBeNull();
    expect(pick.take('board')).toBeNull();
  });
});
