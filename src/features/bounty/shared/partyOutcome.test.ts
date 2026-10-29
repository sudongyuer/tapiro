import { describe, expect, test } from 'bun:test';

import { partyOutcome, showsProgress } from './partyOutcome';

const AFTER_SELECTION = ['assigned', 'en_route', 'done', 'disputed', 'confirmed', 'settled'];

describe('partyOutcome', () => {
  test.each(AFTER_SELECTION)('%s keeps the selection', (status) => {
    expect(partyOutcome(status)).toBe('selected');
  });

  test('a cancelled bounty reads as cancelled, never as selected', () => {
    expect(partyOutcome('cancelled')).toBe('cancelled');
  });

  test.each(['open', 'closed'])('%s has no selection to show', (status) => {
    expect(partyOutcome(status)).toBeNull();
  });
});

describe('showsProgress', () => {
  test.each(['poster', 'helper'] as const)('%s sees the progress once past open', (role) => {
    for (const status of [...AFTER_SELECTION, 'cancelled']) {
      expect(showsProgress(role, status)).toBe(true);
    }
    expect(showsProgress(role, 'open')).toBe(false);
    expect(showsProgress(role, 'closed')).toBe(false);
  });

  test.each(['applicant', 'viewer'] as const)('%s never sees it', (role) => {
    for (const status of [...AFTER_SELECTION, 'cancelled', 'open']) {
      expect(showsProgress(role, status)).toBe(false);
    }
  });
});
