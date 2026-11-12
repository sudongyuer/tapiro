type End = (userId: string) => void;

export function createSessionEnds() {
  const ends = new Set<End>();
  let current: string | null = null;
  return {
    register(end: End) {
      ends.add(end);
      return () => {
        ends.delete(end);
      };
    },
    observe(userId: string | null) {
      const previous = current;
      current = userId;
      if (previous === null || previous === userId) return;
      for (const end of ends) {
        try {
          end(previous);
        } catch {}
      }
    },
  };
}

export type SessionEnds = ReturnType<typeof createSessionEnds>;

export const sessionEnds = createSessionEnds();
