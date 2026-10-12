export type OnboardedStorage = {
  read(): string[];
  write(userIds: string[]): void;
};

export function memoryOnboardedStorage(initial: string[] = []): OnboardedStorage {
  let ids = initial;
  return {
    read: () => ids,
    write: (next) => {
      ids = next;
    },
  };
}

export function createOnboardingStore(storage: OnboardedStorage) {
  let done: ReadonlySet<string> = new Set(storage.read());
  const listeners = new Set<() => void>();

  function update(next: Set<string>) {
    done = next;
    storage.write([...next]);
    for (const listener of listeners) listener();
  }

  return {
    getSnapshot: () => done,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    markDone(userId: string) {
      if (!done.has(userId)) update(new Set([...done, userId]));
    },
    clear(userId: string) {
      if (!done.has(userId)) return;
      const next = new Set(done);
      next.delete(userId);
      update(next);
    },
  };
}

export type OnboardingStore = ReturnType<typeof createOnboardingStore>;
