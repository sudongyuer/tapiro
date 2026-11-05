export type ImageLoad =
  { status: 'loading' } | { status: 'ready'; uri: string } | { status: 'failed' };

const LOADING: ImageLoad = { status: 'loading' };

// A failed load stays failed until the user taps it, so a broken image never retries in a loop while the list
// re-renders.
export function createImageCache(load: (path: string) => Promise<string>) {
  const entries = new Map<string, ImageLoad>();
  const listeners = new Set<() => void>();
  const emit = () => {
    for (const listener of listeners) listener();
  };

  function start(path: string) {
    entries.set(path, LOADING);
    load(path).then(
      (uri) => {
        entries.set(path, { status: 'ready', uri });
        emit();
      },
      () => {
        entries.set(path, { status: 'failed' });
        emit();
      },
    );
  }

  return {
    get(path: string): ImageLoad {
      const known = entries.get(path);
      if (known) return known;
      start(path);
      return LOADING;
    },
    peek: (path: string) => entries.get(path) ?? null,
    retry(path: string) {
      if (entries.get(path)?.status !== 'failed') return;
      start(path);
      emit();
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    clear() {
      entries.clear();
      emit();
    },
  };
}

export type ImageCache = ReturnType<typeof createImageCache>;
