import { describe, expect, test } from 'bun:test';

import {
  checkAccountNumber,
  checkBank,
  checkMalaysianMobile,
  checkPayeeName,
  formatMalaysianMobile,
  maskAccountNumber,
} from './validate';

describe('checkMalaysianMobile', () => {
  test.each([
    ['012-345 6789', '+60123456789'],
    ['0123456789', '+60123456789'],
    ['+60 12-345 6789', '+60123456789'],
    ['60123456789', '+60123456789'],
    ['12 345 6789', '+60123456789'],
    ['011-1234 5678', '+601112345678'],
  ])('%s → %s', (input, e164) => {
    expect(checkMalaysianMobile(input)).toEqual({ ok: true, value: e164 });
  });

  test.each([
    ['03-1234 5678', 'landline'],
    ['+65 9123 4567', 'Singapore'],
    ['012-345', 'too short'],
    ['012-3456 78901', 'too long'],
    ['012-ABC 6789', 'letters'],
  ])('rejects %s (%s)', (input) => {
    expect(checkMalaysianMobile(input)).toEqual({ ok: false, reason: 'invalid' });
  });

  test('empty is its own reason', () => {
    expect(checkMalaysianMobile('  ')).toEqual({ ok: false, reason: 'empty' });
  });

  test('formats for display', () => {
    expect(formatMalaysianMobile('+60123456789')).toBe('+60 12-345 6789');
    expect(formatMalaysianMobile('+601112345678')).toBe('+60 11-1234 5678');
  });
});

describe('checkAccountNumber', () => {
  test('strips spaces and dashes', () => {
    expect(checkAccountNumber('1234 5678-90')).toEqual({ ok: true, value: '1234567890' });
  });

  test.each(['12345', '123456789012345678901', '12345A7890'])('rejects %s', (input) => {
    expect(checkAccountNumber(input)).toEqual({ ok: false, reason: 'invalid' });
  });

  test('masks to the last four digits', () => {
    expect(maskAccountNumber('1234567890')).toBe('•••• 7890');
  });
});

describe('checkPayeeName', () => {
  test('trims and collapses spaces', () => {
    expect(checkPayeeName('  LIM   WEI JIE ')).toEqual({ ok: true, value: 'LIM WEI JIE' });
  });

  test('is required', () => {
    expect(checkPayeeName('')).toEqual({ ok: false, reason: 'empty' });
  });

  test('caps at 60 characters', () => {
    expect(checkPayeeName('A'.repeat(60)).ok).toBe(true);
    expect(checkPayeeName('A'.repeat(61))).toEqual({ ok: false, reason: 'invalid' });
  });
});

describe('checkBank', () => {
  test('accepts a bank from the acquirer table and refuses a wallet', () => {
    expect(checkBank('588734')).toEqual({ ok: true, value: '588734' });
    expect(checkBank('890053')).toEqual({ ok: false, reason: 'invalid' });
    expect(checkBank(null)).toEqual({ ok: false, reason: 'empty' });
  });
});
