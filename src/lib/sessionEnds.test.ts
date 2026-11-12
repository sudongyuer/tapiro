import { describe, expect, test } from 'bun:test';

import { createSessionEnds } from './sessionEnds';

describe('session ends', () => {
  test('sign-out and a switch to another user end the previous session once', () => {
    const ends = createSessionEnds();
    const ended: string[] = [];
    ends.register((userId) => ended.push(userId));
    ends.observe('a');
    ends.observe('a');
    ends.observe(null);
    ends.observe(null);
    ends.observe('a');
    ends.observe('b');
    expect(ended).toEqual(['a', 'a']);
  });

  test('every end runs even after one throws, and an unregistered one does not', () => {
    const ends = createSessionEnds();
    const ended: string[] = [];
    ends.register(() => {
      throw new Error('gone');
    });
    ends.register((userId) => ended.push(userId));
    const off = ends.register(() => ended.push('off'));
    off();
    ends.observe('a');
    ends.observe(null);
    expect(ended).toEqual(['a']);
  });
});
