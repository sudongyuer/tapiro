import { BANKS, OTHER_BANK } from '@/lib/acquirers';

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

export { formatMalaysianMobile } from '@/lib/payeeMethods';

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

export type BankChoice =
  { bankCode: string; bankName: null } | { bankCode: null; bankName: string };

export function checkBank(
  choice: string | null,
  otherName = '',
): FieldCheck<BankChoice> | { ok: false; reason: 'nameEmpty' | 'nameInvalid' } {
  if (!choice) return { ok: false, reason: 'empty' };
  if (choice === OTHER_BANK) {
    const name = checkPayeeName(otherName);
    if (!name.ok)
      return { ok: false, reason: name.reason === 'empty' ? 'nameEmpty' : 'nameInvalid' };
    return { ok: true, value: { bankCode: null, bankName: name.value } };
  }
  return BANKS.some((bank) => bank.id === choice)
    ? { ok: true, value: { bankCode: choice, bankName: null } }
    : { ok: false, reason: 'invalid' };
}
