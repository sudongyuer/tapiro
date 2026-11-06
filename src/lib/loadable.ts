export type LoadStatus = 'loading' | 'ready' | 'failed' | 'stale';

export type Loadable<T> = { status: 'idle' } | { status: LoadStatus; data: T | null };

export const IDLE_LOAD: Loadable<never> = { status: 'idle' };

export const loading = <T>(previous: Loadable<T> | undefined): Loadable<T> =>
  previous && previous.status !== 'idle' && previous.data !== null
    ? previous
    : { status: 'loading', data: null };

export const loaded = <T>(data: T, status: 'ready' | 'stale' = 'ready'): Loadable<T> => ({
  status,
  data,
});

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

// A local write supersedes reads already in flight (their answer may predate it) and asks for one fresh read when it
// dropped one, since that read may also have carried rows the write knows nothing about. A key marked dirty while a
// read is out lands that read as stale, not ready.
export function createRequests() {
  const latest = new Map<string, number>();
  const dirtyAt = new Map<string, number>();
  const out = new Map<string, number>();
  let issued = 0;
  return {
    start(key: string) {
      issued += 1;
      latest.set(key, issued);
      out.set(key, (out.get(key) ?? 0) + 1);
      return issued;
    },
    end(key: string) {
      const left = (out.get(key) ?? 1) - 1;
      if (left <= 0) out.delete(key);
      else out.set(key, left);
    },
    isLatest: (key: string, request: number) => latest.get(key) === request,
    outcome(key: string, request: number): 'ready' | 'stale' | null {
      if (latest.get(key) !== request) return null;
      return (dirtyAt.get(key) ?? 0) > request ? 'stale' : 'ready';
    },
    latest: (key: string) => latest.get(key) ?? 0,
    dirty(key: string) {
      issued += 1;
      dirtyAt.set(key, issued);
    },
    supersede(key: string) {
      issued += 1;
      latest.set(key, issued);
      return out.has(key);
    },
    clear() {
      latest.clear();
      dirtyAt.clear();
      out.clear();
    },
  };
}

export type Requests = ReturnType<typeof createRequests>;

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

export async function readInto<T>({
  requests,
  key,
  read,
  current,
  value,
  set,
}: {
  requests: Requests;
  key: string;
  read: () => Promise<T>;
  current: () => boolean;
  value: () => Loadable<T> | undefined;
  set: (next: Loadable<T>) => void;
}) {
  const request = requests.start(key);
  set(loading(value()));
  try {
    const data = await read();
    const status = requests.outcome(key, request);
    if (status && current()) set(loaded(data, status));
  } catch {
    if (requests.isLatest(key, request) && current()) set(loadFailed(value()));
  } finally {
    requests.end(key);
  }
}
