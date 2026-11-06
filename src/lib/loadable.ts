export type LoadStatus = 'loading' | 'ready' | 'failed' | 'stale';

export type Loadable<T> = { status: 'idle' } | { status: LoadStatus; data: T | null };

export const IDLE_LOAD: Loadable<never> = { status: 'idle' };

export const loading = <T>(previous: Loadable<T> | undefined): Loadable<T> =>
  previous && previous.status !== 'idle' && previous.data !== null
    ? previous
    : { status: 'loading', data: null };

export const loaded = <T>(data: T): Loadable<T> => ({ status: 'ready', data });

export function loadFailed<T>(previous: Loadable<T> | undefined): Loadable<T> {
  if (!previous || previous.status === 'idle' || previous.data === null) {
    return { status: 'failed', data: null };
  }
  return { ...previous, status: 'stale' };
}

export const staleIfReady = <T>(previous: Loadable<T>): Loadable<T> =>
  previous.status === 'ready' ? { ...previous, status: 'stale' } : previous;

export const needsLoad = <T>(value: Loadable<T> | undefined) =>
  !value || value.status === 'idle' || value.status === 'failed' || value.status === 'stale';

export function createRequests() {
  const latest = new Map<string, number>();
  let issued = 0;
  return {
    start(key: string) {
      issued += 1;
      latest.set(key, issued);
      return issued;
    },
    isLatest: (key: string, request: number) => latest.get(key) === request,
    supersede(key: string) {
      issued += 1;
      latest.set(key, issued);
    },
    clear: () => latest.clear(),
  };
}

export function createFocus() {
  const counts = new Map<string, number>();
  return {
    open(key: string) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
      let closed = false;
      return () => {
        if (closed) return;
        closed = true;
        const left = (counts.get(key) ?? 1) - 1;
        if (left <= 0) counts.delete(key);
        else counts.set(key, left);
      };
    },
    has: (key: string) => counts.has(key),
    clear: () => counts.clear(),
  };
}
