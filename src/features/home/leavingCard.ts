import { useState } from 'react';

import type { LiveCardModel } from './homeModel';

export type StackChange = { leaving: LiveCardModel; rising: string | null };

export function stackChange(
  previous: readonly LiveCardModel[],
  next: readonly LiveCardModel[],
): StackChange | null {
  const front = previous[0];
  if (front?.kind !== 'settled' || next.some((card) => card.id === front.id)) return null;
  const newFront = next[0];
  const rising = newFront && !previous.some((card) => card.id === newFront.id) ? newFront.id : null;
  return { leaving: front, rising };
}

// A card React removes is drawn under the cards mounted in the same commit (Reanimated keeps an exiting view at its
// host index and inserts new siblings after it), so the collected 已结清 card stays a live child, on top, until it has
// left.
export function useLeavingCard(cards: readonly LiveCardModel[], animate: boolean) {
  const ids = cards.map((card) => card.id).join('\n');
  const [seen, setSeen] = useState({ ids, cards });
  const [change, setChange] = useState<StackChange | null>(null);
  if (seen.ids !== ids) {
    setSeen({ ids, cards });
    const next = animate ? stackChange(seen.cards, cards) : null;
    if (next) setChange(next);
  }
  const current = change && !cards.some((card) => card.id === change.leaving.id) ? change : null;
  return {
    leaving: current?.leaving ?? null,
    rising: current?.rising ?? null,
    left: (id: string) => setChange((latest) => (latest?.leaving.id === id ? null : latest)),
  };
}
