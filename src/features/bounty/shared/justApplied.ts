import { userCleanups } from '@/lib/userCleanups';

export type ApplySurface = 'card' | 'detail';

export function createJustApplied() {
  const pending = new Map<string, ApplySurface>();
  return {
    set(id: string, surface: ApplySurface) {
      pending.set(id, surface);
    },
    has: (id: string, surface: ApplySurface) => pending.get(id) === surface,
    take(id: string, surface: ApplySurface) {
      if (pending.get(id) !== surface) return false;
      pending.delete(id);
      return true;
    },
    clear() {
      pending.clear();
    },
  };
}

export const justApplied = createJustApplied();

userCleanups.register(() => justApplied.clear());
