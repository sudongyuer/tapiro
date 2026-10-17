import { describe, expect, test } from 'bun:test';

import { verdict } from './expo-doctor-ci.mjs';

const versionOnly =
  '20/21 checks passed. 1 checks failed.\n✖ Check that packages match versions required by installed Expo SDK\n';
const other =
  '20/21 checks passed. 1 checks failed.\n✖ Check that no duplicate dependencies are installed\n';
const both = `${versionOnly}✖ Check that no duplicate dependencies are installed\n`;

describe('expo-doctor CI verdict', () => {
  test('passes a clean run', () => expect(verdict(0, 'ok')).toEqual({ ok: true, warn: false }));
  test('warns only when the version check is the sole failure', () =>
    expect(verdict(1, versionOnly)).toEqual({ ok: true, warn: true }));
  test('fails any other check', () =>
    expect(verdict(1, other)).toEqual({ ok: false, warn: false }));
  test('fails when the version check comes with another failure', () =>
    expect(verdict(1, both)).toEqual({ ok: false, warn: false }));
  test('fails an unexpected crash with no check lines', () =>
    expect(verdict(1, 'boom')).toEqual({ ok: false, warn: false }));
});
