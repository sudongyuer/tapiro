import type { CostBase, CostLine, PostStatus } from './types';

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

export function payTarget(line: CostLine): string | null {
  return line.kind === 'blocked' ? (line.unpaid[0]?.paymentId ?? null) : null;
}
