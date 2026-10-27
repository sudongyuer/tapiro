export const BOUNTY_CATEGORIES = [
  'pickup',
  'buy',
  'queue',
  'handle',
  'move',
  'accompany',
  'study',
  'other',
] as const;
export type BountyCategory = (typeof BOUNTY_CATEGORIES)[number];

export function bountyCategory(value: unknown): BountyCategory | null {
  return BOUNTY_CATEGORIES.find((category) => category === value) ?? null;
}
