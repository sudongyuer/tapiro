import { expect, test } from 'bun:test';

import { signedInLaunch } from './signedInLaunch';

test('a missing, empty or zero argument leaves the app signed out', () => {
  expect(signedInLaunch(undefined)).toBeUndefined();
  expect(signedInLaunch(null)).toBeUndefined();
  expect(signedInLaunch('')).toBeUndefined();
  expect(signedInLaunch('0')).toBeUndefined();
});

test('onboarded marks onboarding done; any other value signs in without it', () => {
  expect(signedInLaunch('onboarded')).toEqual({ onboarded: true });
  expect(signedInLaunch('1')).toEqual({ onboarded: false });
  expect(signedInLaunch(1)).toEqual({ onboarded: false });
});
