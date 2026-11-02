export function createBlockEvents() {
  const listeners = new Set<(posterId: string) => void>();
  return {
    blocked(posterId: string) {
      for (const listener of listeners) listener(posterId);
    },
    onBlocked(listener: (posterId: string) => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export const blockEvents = createBlockEvents();
