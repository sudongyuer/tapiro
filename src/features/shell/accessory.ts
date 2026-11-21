import {
  accessoryPriority,
  inTabAccessory,
  type AccessoryItem,
  type TabAccessoryItem,
} from '@/lib/liveItems';

export type MostUrgent = { item: TabAccessoryItem; more: number };

export function pickMostUrgent(
  items: readonly AccessoryItem[],
  onScreen: string | null = null,
): MostUrgent | null {
  const shown = items.filter(
    (item): item is TabAccessoryItem => inTabAccessory(item) && item.bounty?.target !== onScreen,
  );
  let best: TabAccessoryItem | null = null;
  for (const item of shown) {
    if (!best || accessoryPriority(item.kind) < accessoryPriority(best.kind)) best = item;
  }
  return best ? { item: best, more: shown.length - 1 } : null;
}

export type AccessoryTarget = { href: string; inBountyTab: boolean };

export function accessoryTarget(item: AccessoryItem): AccessoryTarget | null {
  if (item.payment) return { href: `/pay/${item.payment.id}`, inBountyTab: false };
  return item.bounty ? { href: item.bounty.target, inBountyTab: true } : null;
}

// Pushed item pages carry their own pay or confirm bar, so a strip for another item there showed two money prompts at
// once (audit H3); the strip stays on tab roots only.
export function accessoryVisible({
  hasItem,
  onTabRoot,
  onHomeRoot,
  liveCardsOnScreen,
}: {
  hasItem: boolean;
  onTabRoot: boolean;
  onHomeRoot: boolean;
  liveCardsOnScreen: boolean;
}) {
  return hasItem && onTabRoot && !(onHomeRoot && liveCardsOnScreen);
}

export function badgeText(count: number) {
  if (count <= 0) return null;
  return count > 99 ? '99+' : String(count);
}
