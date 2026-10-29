import {
  accessoryPriority,
  inTabAccessory,
  type AccessoryItem,
  type TabAccessoryItem,
} from '@/lib/liveItems';

export type MostUrgent = { item: TabAccessoryItem; more: number };

export function pickMostUrgent(items: readonly AccessoryItem[]): MostUrgent | null {
  const shown = items.filter(inTabAccessory);
  let best: TabAccessoryItem | null = null;
  for (const item of shown) {
    if (!best || accessoryPriority(item.kind) < accessoryPriority(best.kind)) best = item;
  }
  return best ? { item: best, more: shown.length - 1 } : null;
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
