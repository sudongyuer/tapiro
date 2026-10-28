import type { CostBase, CostLine, PostStatus } from './types';

export const MALAYSIA_OFFSET_MS = 8 * 3_600_000;

function base(status: PostStatus): CostBase {
  if (status.freePostsLeft > 0) {
    return { kind: 'free', left: status.freePostsLeft, of: status.freePostsPerMonth };
  }
  if (status.coins >= 1) return { kind: 'coin', balance: status.coins };
  return { kind: 'none', nextFreeAt: status.nextFreeAt };
}

export function costLine(status: PostStatus): CostLine {
  const under = base(status);
  if (!status.blocked) return under;
  const unpaid = [...status.unpaid].sort(
    (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt),
  );
  return { kind: 'blocked', unpaid, under: under.kind };
}

export function malaysiaDay(iso: string) {
  const local = new Date(Date.parse(iso) + MALAYSIA_OFFSET_MS);
  return {
    year: local.getUTCFullYear(),
    month: local.getUTCMonth() + 1,
    day: local.getUTCDate(),
  };
}

export function payTarget(line: CostLine): string | null {
  return line.kind === 'blocked' ? (line.unpaid[0]?.paymentId ?? null) : null;
}
