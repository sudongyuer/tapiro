export type GrowStore = {
  read(userId: string): unknown;
  write(userId: string, value: string | null): void;
};

export function createGrowMarks(store: GrowStore) {
  return {
    played(userId: string) {
      const stored = Number(store.read(userId));
      return Number.isFinite(stored) ? stored : 0;
    },
    mark(userId: string, level: number) {
      store.write(userId, String(level));
    },
    clear(userId: string) {
      store.write(userId, null);
    },
  };
}

export type GrowMarks = ReturnType<typeof createGrowMarks>;
