import { describe, expect, test } from 'bun:test';

import type { LiveCardModel } from './homeModel';
import { stackChange } from './leavingCard';

const card = (id: string, kind: LiveCardModel['kind']) => ({ id, kind }) as LiveCardModel;
const settled = card('settled-1', 'settled');
const calm = card('calm', 'calm');
const owe = card('owe-1', 'oweMoney');

describe('stackChange', () => {
  test('a collected 已结清 card in front leaves, and the card mounted in its place rises', () => {
    expect(stackChange([settled], [calm])).toEqual({ leaving: settled, rising: 'calm' });
  });

  test('a card that was behind restacks on its own and does not rise from behind', () => {
    expect(stackChange([settled, owe], [owe])).toEqual({ leaving: settled, rising: null });
  });

  test('only a front 已结清 card leaves', () => {
    expect(stackChange([owe, settled], [owe])).toBeNull();
    expect(stackChange([owe], [calm])).toBeNull();
  });

  test('a front 已结清 card that is still listed does not leave', () => {
    expect(stackChange([settled, owe], [owe, settled])).toBeNull();
  });

  test('an empty stack has nothing to leave', () => {
    expect(stackChange([], [calm])).toBeNull();
    expect(stackChange([settled], [])).toEqual({ leaving: settled, rising: null });
  });
});
