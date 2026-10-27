import { describe, expect, test } from 'bun:test';

import { toFailure } from './publishError';

describe('toFailure', () => {
  test.each([
    [{ message: 'publish_blocked', code: '55000' }, 'blocked'],
    [{ message: 'no_balance', code: '55000' }, 'noBalance'],
    [{ message: 'invalid_bounty', code: '22023' }, 'invalid'],
    [{ message: 'post_already_sent', code: '55000' }, 'alreadySent'],
    [
      { message: 'new row violates check constraint "bounties_title_check"', code: '23514' },
      'invalid',
    ],
  ] as const)('%p → %s', (error, failure) => {
    expect(toFailure(error)).toBe(failure);
  });

  test.each([
    [new TypeError('Network request failed')],
    [undefined],
    [null],
    ['publish_blocked'],
    [{ message: 'item_charged_elsewhere', code: '22023' }],
    [{ message: 'something_new', code: '55000' }],
    [{ message: 'JWT expired', code: 'PGRST301' }],
  ])('%p → failed', (error) => {
    expect(toFailure(error)).toBe('failed');
  });
});
