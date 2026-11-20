import { createStore } from '../store';
import { storefrontCode, type StorefrontState } from './region';

export type StorefrontSource = {
  countryCode(): Promise<string | null>;
  listen(cb: (countryCode: string) => void): { remove(): void };
};

export type StorefrontCache = {
  read(): unknown;
  write(value: string): void;
};

export const NO_STOREFRONT = 'none';

export function createStorefront({
  source,
  cache,
  timeoutMs,
}: {
  source: StorefrontSource;
  cache: StorefrontCache;
  timeoutMs: number;
}) {
  const saved = cache.read();
  let stored = saved === NO_STOREFRONT ? NO_STOREFRONT : storefrontCode(saved);
  const store = createStore<StorefrontState>({
    countryCode: stored === NO_STOREFRONT ? null : stored,
    resolved: stored === NO_STOREFRONT,
  });
  let latest = 0;

  function save(value: string) {
    if (value === stored) return;
    stored = value;
    cache.write(value);
  }

  function resolveUnknown() {
    const current = store.get();
    if (!current.resolved) store.set({ ...current, resolved: true });
  }

  function apply(value: unknown) {
    const code = storefrontCode(value);
    const current = store.get();
    if (code === null) {
      if (stored === null) save(NO_STOREFRONT);
      resolveUnknown();
      return;
    }
    save(code);
    if (code !== current.countryCode || !current.resolved) {
      store.set({ countryCode: code, resolved: true });
    }
  }

  async function refresh() {
    const call = ++latest;
    const answer = source.countryCode().catch(() => null);
    void answer.then((value) => {
      if (call === latest) apply(value);
    });
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timedOut = new Promise<void>((resolve) => {
      timer = setTimeout(resolve, timeoutMs);
    });
    await Promise.race([answer.then(() => undefined), timedOut]);
    clearTimeout(timer);
    resolveUnknown();
  }

  function follow() {
    const subscription = source.listen((code) => {
      latest += 1;
      apply(code);
    });
    void refresh();
    return () => subscription.remove();
  }

  return { get: store.get, subscribe: store.subscribe, refresh, follow };
}

export type StorefrontStore = ReturnType<typeof createStorefront>;
