import { describe, expect, test } from 'bun:test';

import { feedStep } from './feedStep';

const sending = { phase: 'sending' } as const;
const fed = { phase: 'answered', status: 'fed' } as const;
const already = { phase: 'answered', status: 'already_fed' } as const;
const failed = { phase: 'failed' } as const;
const landed = { tapped: true, landed: true, chewed: false };

describe('feed step', () => {
  test('nothing happens before a tap', () => {
    expect(feedStep({ tapped: false, landed: false, chewed: false, feed: { phase: 'idle' } })).toBe(
      'idle',
    );
  });

  test('the leaf finishes its drop even when the answer is already in', () => {
    expect(feedStep({ ...landed, landed: false, feed: fed })).toBe('dropping');
    expect(feedStep({ ...landed, landed: false, feed: failed })).toBe('dropping');
  });

  test('a landed leaf waits for the server', () => {
    expect(feedStep({ ...landed, feed: sending })).toBe('waiting');
  });

  test('only fed chews, and the thanks follows the chew', () => {
    expect(feedStep({ ...landed, feed: fed })).toBe('chewing');
    expect(feedStep({ ...landed, chewed: true, feed: fed })).toBe('fed');
  });

  test('already fed and a failure never chew', () => {
    expect(feedStep({ ...landed, feed: already })).toBe('alreadyFed');
    expect(feedStep({ ...landed, feed: failed })).toBe('failed');
  });
});
