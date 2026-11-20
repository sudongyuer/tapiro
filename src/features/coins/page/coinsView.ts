import type { TFunction } from 'i18next';

import { dateFormat } from '@/lib/intlCache';

import { reasonKey, signedDelta } from '../history';
import type { CoinRow } from '../types';

const locale = (language: string) => `${language}-MY`;

export { coinCount } from '@/lib/coinCount';

export const malaysiaYear = (now: Date) =>
  Number(dateFormat('en', { timeZone: 'Asia/Kuala_Lumpur', year: 'numeric' }).format(now));

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

export function monthLabel(month: string, t: TFunction, currentYear: number) {
  const [year, number] = month.split('-').map(Number);
  const name = t(`coins.monthName.m${MONTHS[number - 1]}`);
  return year === currentYear ? t('coins.month', { name }) : t('coins.monthYear', { name, year });
}

export const rowDate = (at: string, language: string) =>
  dateFormat(locale(language), { month: 'short', day: 'numeric' }).format(new Date(at));

export function rowTitle(row: CoinRow, t: TFunction) {
  const named = t(reasonKey(row.reason));
  const reason = row.sandbox ? t('coins.sandbox', { reason: named }) : named;
  const title = row.item?.title?.trim();
  return title ? t('coins.withTitle', { reason, title }) : reason;
}

export const rowA11y = (row: CoinRow, t: TFunction, language: string) =>
  [rowTitle(row, t), signedDelta(row.delta), rowDate(row.at, language)].join(t('coins.listJoin'));
