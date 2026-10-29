import { toMoney, type Money } from '@/lib/money';

type Body = Record<string, unknown>;

export const fail = (what: string): never => {
  throw new Error(`sticker read returned an unexpected ${what}`);
};

export const body = (value: unknown, what: string): Body =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Body)
    : fail(what);

export const text = (value: unknown, what: string): string =>
  typeof value === 'string' ? value : fail(what);

export const textOrNull = (value: unknown, what: string): string | null =>
  value === null || value === undefined ? null : text(value, what);

export const oneOf = <T extends string>(values: readonly T[], value: unknown, what: string): T =>
  values.find((candidate) => candidate === value) ?? fail(what);

export const money = (value: unknown, what: string): Money => {
  const amount = body(value, what);
  return toMoney(amount.minor, amount.currency) ?? fail(what);
};

export const rows = <T>(value: unknown, what: string, parse: (row: unknown) => T): T[] =>
  Array.isArray(value) ? value.map(parse) : fail(what);
