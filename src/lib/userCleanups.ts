type Cleanup = (userId: string) => void;

export function createUserCleanups() {
  const cleanups = new Set<Cleanup>();
  return {
    register(cleanup: Cleanup) {
      cleanups.add(cleanup);
      return () => {
        cleanups.delete(cleanup);
      };
    },
    run(userId: string) {
      for (const cleanup of cleanups) {
        try {
          cleanup(userId);
        } catch {}
      }
    },
  };
}

export type UserCleanups = ReturnType<typeof createUserCleanups>;

export const userCleanups = createUserCleanups();
