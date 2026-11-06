import type { TFunction } from 'i18next';

import { reasonKey, signedDelta } from '../history';
import type { CoinRow } from '../types';

const locale = (language: string) => `${language}-MY`;

export const coinCount = (coins: number, language: string) =>
  new Intl.NumberFormat(locale(language)).format(coins);

const malaysiaYear = (now: Date) =>
  Number(
    new Intl.DateTimeFormat('en', { timeZone: 'Asia/Kuala_Lumpur', year: 'numeric' }).format(now),
  );

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

export function monthLabel(month: string, t: TFunction, now: Date) {
  const [year, number] = month.split('-').map(Number);
  const name = t(`coins.monthName.m${MONTHS[number - 1]}`);
  return year === malaysiaYear(now)
    ? t('coins.month', { name })
    : t('coins.monthYear', { name, year });
}

export const rowDate = (at: string, language: string) =>
  new Intl.DateTimeFormat(locale(language), { month: 'short', day: 'numeric' }).format(
    new Date(at),
  );

export function rowTitle(row: CoinRow, t: TFunction) {
  const reason = t(reasonKey(row.reason));
  const title = row.item?.title?.trim();
  return title ? t('coins.withTitle', { reason, title }) : reason;
}

export const rowA11y = (row: CoinRow, t: TFunction, language: string) =>
  [rowTitle(row, t), signedDelta(row.delta), rowDate(row.at, language)].join(t('coins.listJoin'));
