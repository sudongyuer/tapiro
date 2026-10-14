import { accessoryPriority, type AccessoryItem } from '@/lib/liveItems';

export type MostUrgent = { item: AccessoryItem; more: number };

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
