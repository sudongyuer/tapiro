import type { BoardOrigin, BoardPage, BoardRow, BoardState } from './types';

export const row = (id: string, patch: Partial<BoardRow> = {}): BoardRow => ({
  id,
  title: `title ${id}`,
  category: 'pickup',
  reward: { minor: 800, currency: 'MYR' },
  reference: null,
  placeLabel: null,
  stickerPath: null,
  startsAt: null,
  endsAt: null,
  deadlineAt: null,
  urgent: false,
  distanceM: null,
  appliedByMe: false,
  createdAt: '2026-10-27T03:00:00.000Z',
  poster: { id: 'poster', name: '小林', tier: 'reliable' },
  ...patch,
});

export const page = (
  ids: string[],
  next: unknown | null = null,
  total?: number,
  beyondTotal?: number,
): BoardPage => ({
  items: ids.map((id) => row(id)),
  next,
  ...(total === undefined ? {} : { total }),
  ...(beyondTotal === undefined ? {} : { beyondTotal }),
});

export const AT = '2026-10-27T04:00:00.000Z';
export const LATER = '2026-10-27T04:05:00.000Z';

export const ids = (state: BoardState) =>
  state.kind === 'ready' ? state.rows.map((item) => item.id) : null;

export const ready = (state: BoardState) => {
  if (state.kind !== 'ready') throw new Error(`expected ready, got ${state.kind}`);
  return state;
};

export const ME: Extract<BoardOrigin, { kind: 'me' }> = {
  kind: 'me',
  point: { latitude: 3.0733, longitude: 101.6078 },
};
export const NONE: BoardOrigin = { kind: 'none', reason: 'denied' };

export function deferredService() {
  const calls: { origin: BoardOrigin; filter: string; after: unknown }[] = [];
  const pending: { resolve(page: BoardPage): void; reject(error: unknown): void }[] = [];
  return {
    calls,
    pending,
    service: {
      page(origin: BoardOrigin, filter: string, after: unknown) {
        calls.push({ origin, filter, after });
        return new Promise<BoardPage>((resolve, reject) => pending.push({ resolve, reject }));
      },
    },
  };
}

export const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

export const mixed = (entries: [string, string][], total?: number): BoardPage => ({
  items: entries.map(([id, poster]) =>
    row(id, { poster: { id: poster, name: poster, tier: 'reliable' } }),
  ),
  next: null,
  ...(total === undefined ? {} : { total, beyondTotal: total }),
});
