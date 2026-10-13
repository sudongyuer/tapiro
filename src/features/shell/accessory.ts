export const ACCESSORY_KINDS = ['oweMoney', 'rideSoon', 'owedToYou', 'bountyInProgress'] as const;
export type AccessoryKind = (typeof ACCESSORY_KINDS)[number];

export type AccessoryItem = {
  id: string;
  kind: AccessoryKind;
  title: string;
  sub: string;
};

export type MostUrgent = { item: AccessoryItem; more: number };

export function accessoryPriority(kind: AccessoryKind) {
  return ACCESSORY_KINDS.indexOf(kind) + 1;
}

export function pickMostUrgent(items: readonly AccessoryItem[]): MostUrgent | null {
  let best: AccessoryItem | null = null;
  for (const item of items) {
    if (!best || accessoryPriority(item.kind) < accessoryPriority(best.kind)) best = item;
  }
  return best ? { item: best, more: items.length - 1 } : null;
}

export function accessoryVisible({
  hasItem,
  onHomeRoot,
  liveCardsOnScreen,
}: {
  hasItem: boolean;
  onHomeRoot: boolean;
  liveCardsOnScreen: boolean;
}) {
  return hasItem && !(onHomeRoot && liveCardsOnScreen);
}

export function badgeText(count: number) {
  if (count <= 0) return null;
  return count > 99 ? '99+' : String(count);
}
