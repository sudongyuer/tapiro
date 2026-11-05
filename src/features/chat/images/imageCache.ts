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

  let generation = 0;

  function start(path: string) {
    const at = generation;
    entries.set(path, LOADING);
    const settle = (next: ImageLoad) => {
      if (at !== generation) return;
      entries.set(path, next);
      emit();
    };
    load(path).then(
      (uri) => settle({ status: 'ready', uri }),
      () => settle({ status: 'failed' }),
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
      generation += 1;
      entries.clear();
      emit();
    },
  };
}

export type ImageCache = ReturnType<typeof createImageCache>;
