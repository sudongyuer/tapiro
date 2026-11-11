import { describe, expect, test } from 'bun:test';

import { APP_CONSENT_VERSION, cloudAccess, toConsentStatus, toWriteFailure } from './consent';
import { splitBold } from './splitBold';

const AT = '2026-11-12T03:00:00.000Z';

describe('toConsentStatus', () => {
  test('reads the consent part of ai_status', () => {
    expect(
      toConsentStatus({
        consent: { currentVersion: 1, given: true, acceptedAt: AT },
        energy: 1000,
      }),
    ).toEqual({ currentVersion: 1, given: true, acceptedAt: AT });
  });

  test('a missing acceptedAt reads as none when not given', () => {
    expect(toConsentStatus({ consent: { currentVersion: 1, given: false } })).toEqual({
      currentVersion: 1,
      given: false,
      acceptedAt: null,
    });
  });

  test.each([
    ['null', null],
    ['no consent', { energy: 1 }],
    ['a version below 1', { consent: { currentVersion: 0, given: false } }],
    ['a string flag', { consent: { currentVersion: 1, given: 'true' } }],
    ['given without a time', { consent: { currentVersion: 1, given: true, acceptedAt: null } }],
    ['a broken time', { consent: { currentVersion: 1, given: true, acceptedAt: 'soon' } }],
  ])('refuses %s instead of guessing', (_, value) => {
    expect(() => toConsentStatus(value)).toThrow();
  });
});

describe('cloudAccess', () => {
  test('the app pins version 1, the copy it shows', () => {
    expect(APP_CONSENT_VERSION).toBe(1);
  });

  test('given consent opens the cloud', () => {
    expect(cloudAccess({ currentVersion: 1, given: true, acceptedAt: AT })).toBe('given');
  });

  test('not given at the app version asks for consent', () => {
    expect(cloudAccess({ currentVersion: 1, given: false, acceptedAt: null })).toBe('notGiven');
  });

  test('a newer server version cannot be agreed from this build', () => {
    expect(cloudAccess({ currentVersion: 2, given: false, acceptedAt: null })).toBe('needsUpdate');
  });

  test('consent to the newer version given on another device still counts', () => {
    expect(cloudAccess({ currentVersion: 2, given: true, acceptedAt: AT })).toBe('given');
  });
});

describe('toWriteFailure', () => {
  test('a stale version asks for an update; anything else is a plain failure', () => {
    expect(toWriteFailure({ message: 'stale_consent_version', code: '22023' })).toBe('needsUpdate');
    expect(toWriteFailure({ message: 'TypeError: Network request failed' })).toBe('failed');
    expect(toWriteFailure(null)).toBe('failed');
  });
});

describe('splitBold', () => {
  test('splits the provider out of the body', () => {
    expect(splitBold('发给<b>阿里云</b>，用来起草')).toEqual({
      before: '发给',
      bold: '阿里云',
      after: '，用来起草',
    });
  });

  test('copy without a tag stays whole', () => {
    expect(splitBold('plain')).toBeNull();
  });
});
