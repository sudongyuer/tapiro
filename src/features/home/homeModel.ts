import type {
  AccessoryItem,
  AccessoryKind,
  BountyCardDetail,
  CardDetail,
  SourceIssue,
} from '@/lib/liveItems';
import type { StageState } from '@/ui/MascotStage';

export type LiveCardModel =
  | { kind: 'calm'; id: 'calm' }
  | { kind: 'unavailable'; id: 'unavailable'; issue: SourceIssue }
  | { kind: AccessoryKind; id: string; item: AccessoryItem; detail: CardDetail | null };

// Not knowing is not the same as nothing to do: a source that is loading, failed or stale keeps the stage off calm.
export function stageState(
  items: readonly AccessoryItem[],
  issues: readonly SourceIssue[] = [],
): StageState {
  if (items.some((item) => item.kind === 'oweMoney')) return 'urgent';
  return items.length > 0 || issues.length > 0 ? 'live' : 'calm';
}

export function liveCards(
  items: readonly AccessoryItem[],
  details: Readonly<Record<string, CardDetail>>,
  priority: (kind: AccessoryKind) => number,
  issues: readonly SourceIssue[] = [],
): LiveCardModel[] {
  const problem =
    issues.find((issue) => issue.status !== 'loading') ??
    (items.length === 0 ? issues[0] : undefined);
  const unavailable: LiveCardModel[] = problem
    ? [{ kind: 'unavailable', id: 'unavailable', issue: problem }]
    : [];
  if (items.length === 0) return unavailable.length ? unavailable : [{ kind: 'calm', id: 'calm' }];
  return [...unavailable, ...sortedCards(items, details, priority)];
}

function sortedCards(
  items: readonly AccessoryItem[],
  details: Readonly<Record<string, CardDetail>>,
  priority: (kind: AccessoryKind) => number,
): LiveCardModel[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => priority(a.item.kind) - priority(b.item.kind) || a.index - b.index)
    .map(({ item }) => {
      const detail = details[item.id] ?? paymentDetail(item) ?? item.bounty ?? item.settled;
      return {
        kind: item.kind,
        id: item.id,
        item,
        detail: detail && detail.kind === item.kind ? withPayment(detail, item) : null,
      };
    });
}

function paymentDetail(item: AccessoryItem): CardDetail | undefined {
  const { payment, amount } = item;
  if (!payment || amount === undefined) return undefined;
  if (item.kind === 'oweMoney')
    return {
      kind: 'oweMoney',
      paymentId: payment.id,
      payee: payment.counterpart,
      amount,
      note: payment.note,
      category: 'other',
    };
  if (item.kind === 'owedToYou')
    return {
      kind: 'owedToYou',
      payer: payment.counterpart,
      amount,
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
  | { key: 'bounty'; title: string; line: string }
  | { key: 'live' }
  | { key: 'calm' };

export function stageLine(cards: readonly LiveCardModel[]): StageLine {
  const front = cards[0];
  if (front.kind === 'calm') return { key: 'calm' };
  if (front.kind === 'unavailable') return { key: 'live' };
  const { detail } = front;
  switch (detail?.kind) {
    case 'oweMoney':
      return { key: 'payNamed', name: detail.payee };
    case 'rideSoon':
      return { key: 'rideMinutes', count: detail.minutesLeft };
    case 'owedToYou':
      return { key: 'owedNamed', name: detail.payer };
    case 'bountyAction':
    case 'bountyInProgress':
    case 'waitingConfirm':
      return { key: 'bounty', title: detail.title, line: detail.line };
    default:
      return front.kind === 'oweMoney' ? { key: 'pay' } : { key: 'live' };
  }
}

export function bountyDetail(card: LiveCardModel): BountyCardDetail | null {
  if (!('detail' in card) || !card.detail) return null;
  const { detail } = card;
  return detail.kind === 'bountyAction' ||
    detail.kind === 'bountyInProgress' ||
    detail.kind === 'waitingConfirm'
    ? detail
    : null;
}

export type SeenCard = { id: string; markSeen: () => Promise<void> };

export function shownOneTimeCards(cards: readonly LiveCardModel[], open: boolean): SeenCard[] {
  return (open ? cards : cards.slice(0, 1)).flatMap((card) => {
    const detail = bountyDetail(card);
    return detail?.oneTime && detail.markSeen ? [{ id: card.id, markSeen: detail.markSeen }] : [];
  });
}

export function createSeenMarks() {
  const marked = new Set<string>();
  const pending = new Set<string>();
  let shown = new Set<string>();
  return (cards: readonly SeenCard[]) => {
    for (const { id, markSeen } of cards) {
      if (shown.has(id) || marked.has(id) || pending.has(id)) continue;
      pending.add(id);
      markSeen()
        .then(
          () => marked.add(id),
          () => undefined,
        )
        .finally(() => pending.delete(id));
    }
    shown = new Set(cards.map((card) => card.id));
  };
}
