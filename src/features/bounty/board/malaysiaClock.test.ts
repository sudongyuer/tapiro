import { describe, expect, test } from 'bun:test';

import { malaysiaClock } from './malaysiaClock';

describe('malaysiaClock', () => {
  test('shows HH:mm in Malaysia time whatever the device zone', () => {
    expect(malaysiaClock('2026-10-27T01:05:00.000Z')).toBe('09:05');
    expect(malaysiaClock('2026-10-27T16:30:00.000Z')).toBe('00:30');
    expect(malaysiaClock('2026-10-27T15:59:59.000Z')).toBe('23:59');
  });
});
