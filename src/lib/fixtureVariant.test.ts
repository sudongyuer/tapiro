import { expect, test } from 'bun:test';

import { fixtureVariant } from './fixtureVariant';

test('unknown or missing launch values fall back to demo', () => {
  expect(fixtureVariant('worst')).toBe('worst');
  expect(fixtureVariant(undefined)).toBe('demo');
  expect(fixtureVariant('huge')).toBe('demo');
});
