import { createStore } from '../store';
import { storefrontCode, type StorefrontState } from './region';

export type StorefrontSource = {
  countryCode(): Promise<string | null>;
  listen(cb: (countryCode: string) => void): { remove(): void };
};

export type StorefrontCache = {
  read(): unknown;
  write(countryCode: string): void;
};

export function createStorefront({
  source,
  cache,
  timeoutMs,
}: {
  source: StorefrontSource;
  cache: StorefrontCache;
  timeoutMs: number;
}) {
  let stored = storefrontCode(cache.read());
  const store = createStore<StorefrontState>({ countryCode: stored, resolved: false });

  function apply(value: unknown) {
    const code = storefrontCode(value);
    const current = store.get();
    if (code === null) {
      if (!current.resolved) store.set({ ...current, resolved: true });
      return;
    }
    if (code !== stored) {
      stored = code;
      cache.write(code);
    }
    if (code !== current.countryCode || !current.resolved) {
      store.set({ countryCode: code, resolved: true });
    }
  }

  async function refresh() {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timedOut = new Promise<null>((resolve) => {
      timer = setTimeout(() => resolve(null), timeoutMs);
    });
    const answer = await Promise.race([source.countryCode().catch(() => null), timedOut]);
    clearTimeout(timer);
    apply(answer);
  }

  function follow() {
    const subscription = source.listen(apply);
    void refresh();
    return () => subscription.remove();
  }

  return { get: store.get, subscribe: store.subscribe, refresh, follow };
}

export type StorefrontStore = ReturnType<typeof createStorefront>;
