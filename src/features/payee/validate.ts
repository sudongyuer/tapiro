import { BANKS } from './acquirers';

export const PAYEE_NAME_MAX = 60;
export const ACCOUNT_DIGITS = { min: 6, max: 20 } as const;

export type FieldCheck<T> = { ok: true; value: T } | { ok: false; reason: 'empty' | 'invalid' };

const stripSeparators = (text: string) => text.replace(/[\s\-().]/g, '');

export function checkMalaysianMobile(input: string): FieldCheck<string> {
  const compact = stripSeparators(input);
  if (compact === '') return { ok: false, reason: 'empty' };
  const national = compact.startsWith('+60')
    ? compact.slice(3)
    : compact.startsWith('60')
      ? compact.slice(2)
      : compact.startsWith('0')
        ? compact.slice(1)
        : compact;
  const e164 = `+60${national}`;
  return /^\+601\d{8,9}$/.test(e164) ? { ok: true, value: e164 } : { ok: false, reason: 'invalid' };
}

export function formatMalaysianMobile(e164: string) {
  const national = e164.replace(/^\+60/, '');
  if (!/^1\d{8,9}$/.test(national)) return e164;
  const head = national.slice(0, 2);
  const rest = national.slice(2);
  const split = rest.length === 8 ? 4 : 3;
  return `+60 ${head}-${rest.slice(0, split)} ${rest.slice(split)}`;
}

export function checkAccountNumber(input: string): FieldCheck<string> {
  const compact = stripSeparators(input);
  if (compact === '') return { ok: false, reason: 'empty' };
  const valid =
    /^\d+$/.test(compact) &&
    compact.length >= ACCOUNT_DIGITS.min &&
    compact.length <= ACCOUNT_DIGITS.max;
  return valid ? { ok: true, value: compact } : { ok: false, reason: 'invalid' };
}

export function maskAccountNumber(digits: string) {
  return `•••• ${digits.slice(-4)}`;
}

export function checkPayeeName(input: string): FieldCheck<string> {
  const value = input.trim().replace(/\s+/g, ' ');
  if (value === '') return { ok: false, reason: 'empty' };
  return [...value].length <= PAYEE_NAME_MAX
    ? { ok: true, value }
    : { ok: false, reason: 'invalid' };
}

export function checkBank(code: string | null): FieldCheck<string> {
  if (!code) return { ok: false, reason: 'empty' };
  return BANKS.some((bank) => bank.id === code)
    ? { ok: true, value: code }
    : { ok: false, reason: 'invalid' };
}
