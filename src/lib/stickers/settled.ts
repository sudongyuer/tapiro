import type { TFunction } from 'i18next';

import type { AccessoryItem, SettledDetail } from '@/lib/liveItems';
import type { Money } from '@/lib/money';

import { stickerArt, STICKER_KINDS, type StickerKind } from './model';
import { artOrNull, body, money, oneOf, rows, text, textOrNull } from './parse';

export type SettledRow = {
  stickerId: string;
  paymentId: string;
  itemKind: StickerKind;
  category: string | null;
  art: string | null;
  title: string;
  earnedAt: string;
  counterpartName: string | null;
  amount: Money;
};

export type CollectResult = 'collected' | 'notFound' | 'failed';

export type SettledService = {
  list(): Promise<SettledRow[]>;
  collect(stickerId: string): Promise<CollectResult>;
};

export type SettledItem = AccessoryItem & { kind: 'settled'; settled: SettledDetail };

export function toSettledRow(value: unknown): SettledRow {
  const row = body(value, 'settled card');
  return {
    stickerId: text(row.stickerId, 'stickerId'),
    paymentId: text(row.paymentId, 'paymentId'),
    itemKind: oneOf(STICKER_KINDS, row.itemKind, 'itemKind'),
    category: textOrNull(row.category, 'category'),
    art: artOrNull(row.art),
    title: text(row.title, 'title'),
    earnedAt: text(row.earnedAt, 'earnedAt'),
    counterpartName: textOrNull(row.counterpartName, 'counterpartName'),
    amount: money(row.amount, 'amount'),
  };
}

export const toSettledRows = (value: unknown) => rows(value, 'settled cards', toSettledRow);

export const settledItemId = (stickerId: string) => `settled-${stickerId}`;

export function settledItem(row: SettledRow, t: TFunction): SettledItem {
  const counterpart = row.counterpartName?.trim() || null;
  const line = counterpart
    ? t('home.card.settled.line', { title: row.title, name: counterpart })
    : t('home.card.settled.lineUnnamed', { title: row.title });
  const settled: SettledDetail = {
    kind: 'settled',
    stickerId: row.stickerId,
    paymentId: row.paymentId,
    art: stickerArt(row),
    title: row.title,
    counterpart,
    amount: row.amount,
    line,
  };
  return {
    id: settledItemId(row.stickerId),
    kind: 'settled',
    title: t('home.card.settled.strip', { title: row.title }),
    amount: row.amount,
    sub: line,
    settled,
  };
}
