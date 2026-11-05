export function createBlockEvents() {
  const blockedListeners = new Set<(personId: string) => void>();
  const unblockedListeners = new Set<(personId: string) => void>();
  const listen =
    (listeners: Set<(personId: string) => void>) => (listener: (personId: string) => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    };
  return {
    blocked(personId: string) {
      for (const listener of blockedListeners) listener(personId);
    },
    unblocked(personId: string) {
      for (const listener of unblockedListeners) listener(personId);
    },
    onBlocked: listen(blockedListeners),
    onUnblocked: listen(unblockedListeners),
  };
}

export const blockEvents = createBlockEvents();
