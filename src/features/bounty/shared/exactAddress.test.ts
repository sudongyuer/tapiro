import { describe, expect, test } from 'bun:test';

import { addressView, type AddressLoad } from './exactAddress';

const loaded = (address: string | null): AddressLoad => ({ kind: 'ready', detail: { address } });

describe('addressView', () => {
  test('a loaded address is shown', () => {
    expect(addressView(loaded('A 座 12-03'))).toEqual({ kind: 'shown', address: 'A 座 12-03' });
  });

  test('a bounty published without an exact address has no address row, never a failure', () => {
    expect(addressView(loaded(null))).toEqual({ kind: 'none' });
  });

  test('only a failed detail load offers a retry', () => {
    expect(addressView({ kind: 'failed' })).toEqual({ kind: 'failed' });
  });

  test('a failed refresh keeps the address it already has', () => {
    const refreshFailed = { kind: 'ready', detail: { address: 'A 座 12-03' }, refreshFailed: true };
    expect(addressView(refreshFailed as AddressLoad)).toEqual({
      kind: 'shown',
      address: 'A 座 12-03',
    });
  });

  test('a gone detail offers a retry rather than an empty row', () => {
    expect(addressView({ kind: 'gone' })).toEqual({ kind: 'failed' });
  });

  test('loading shows progress', () => {
    expect(addressView({ kind: 'loading' })).toEqual({ kind: 'loading' });
  });
});
