import type { AccessoryItem, AccessoryKind } from '@/lib/liveItems';
import { formatRinggitParts } from '@/lib/money';
import type { StickerCategory } from '@/ui/CategorySticker';
import type { StageState } from '@/ui/MascotStage';

export type PayDetail = {
  kind: 'oweMoney';
  paymentId: string | null;
  payee: string;
  amountSen: number;
  note: string;
  category: StickerCategory;
};

export type RideDetail = {
  kind: 'rideSoon';
  departAt: string;
  route: string;
  countdown: string;
  minutesLeft: number;
  seats: string;
  youBook: boolean;
  meet: string;
  destination: string;
  progress: number;
  riders: readonly string[];
};

export type OwedDetail = {
  kind: 'owedToYou';
  payer: string;
  amountSen: number;
  note: string;
  category: StickerCategory;
};

export type ProgressDetail = {
  kind: 'bountyInProgress';
  helper: string;
  when: string;
  title: string;
  amountSen: number;
  category: StickerCategory;
};

export type CardDetail = PayDetail | RideDetail | OwedDetail | ProgressDetail;

export type LiveCardModel =
  | { kind: 'calm'; id: 'calm' }
  | { kind: AccessoryKind; id: string; item: AccessoryItem; detail: CardDetail | null };

export function stageState(items: readonly AccessoryItem[]): StageState {
  if (items.some((item) => item.kind === 'oweMoney')) return 'urgent';
  return items.length > 0 ? 'live' : 'calm';
}

export function liveCards(
  items: readonly AccessoryItem[],
  details: Readonly<Record<string, CardDetail>>,
  priority: (kind: AccessoryKind) => number,
): LiveCardModel[] {
  if (items.length === 0) return [{ kind: 'calm', id: 'calm' }];
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => priority(a.item.kind) - priority(b.item.kind) || a.index - b.index)
    .map(({ item }) => {
      const detail = details[item.id] ?? paymentDetail(item);
      return {
        kind: item.kind,
        id: item.id,
        item,
        detail: detail && detail.kind === item.kind ? withPayment(detail, item) : null,
      };
    });
}

function paymentDetail(item: AccessoryItem): CardDetail | undefined {
  const { payment, amountSen } = item;
  if (!payment || amountSen === undefined) return undefined;
  if (item.kind === 'oweMoney')
    return {
      kind: 'oweMoney',
      paymentId: payment.id,
      payee: payment.counterpart,
      amountSen,
      note: payment.note,
      category: 'other',
    };
  if (item.kind === 'owedToYou')
    return {
      kind: 'owedToYou',
      payer: payment.counterpart,
      amountSen,
      note: payment.note,
      category: 'other',
    };
  return undefined;
}

function withPayment(detail: CardDetail, item: AccessoryItem): CardDetail {
  return detail.kind === 'oweMoney' ? { ...detail, paymentId: item.payment?.id ?? null } : detail;
}

export type StageLine =
  | { key: 'payNamed'; name: string }
  | { key: 'pay' }
  | { key: 'rideMinutes'; count: number }
  | { key: 'owedNamed'; name: string }
  | { key: 'progressNamed'; name: string }
  | { key: 'live' }
  | { key: 'calm' };

export function stageLine(cards: readonly LiveCardModel[]): StageLine {
  const front = cards[0];
  if (front.kind === 'calm') return { key: 'calm' };
  const { detail } = front;
  switch (detail?.kind) {
    case 'oweMoney':
      return { key: 'payNamed', name: detail.payee };
    case 'rideSoon':
      return { key: 'rideMinutes', count: detail.minutesLeft };
    case 'owedToYou':
      return { key: 'owedNamed', name: detail.payer };
    case 'bountyInProgress':
      return { key: 'progressNamed', name: detail.helper };
    default:
      return front.kind === 'oweMoney' ? { key: 'pay' } : { key: 'live' };
  }
}

export function moneyParts(amountSen: number, locale: string) {
  return formatRinggitParts(amountSen, locale);
}

export function moneyText(amountSen: number, locale: string) {
  const { whole, cents } = moneyParts(amountSen, locale);
  return cents === '.00' ? whole : `${whole}${cents}`;
}
