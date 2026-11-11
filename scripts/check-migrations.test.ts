import { describe, expect, test } from 'bun:test';

import { duplicateVersions } from './check-migrations.mjs';

describe('duplicateVersions', () => {
  test('groups files that share a version', () => {
    expect(
      duplicateVersions(['20261112000100_a.sql', '20261112000100_b.sql', '20261112000200_c.sql']),
    ).toEqual([['20261112000100_a.sql', '20261112000100_b.sql']]);
  });

  test('passes distinct versions and ignores other files', () => {
    expect(
      duplicateVersions(['20261112000100_a.sql', '20261112000200_b.sql', 'README.md']),
    ).toEqual([]);
  });
});
