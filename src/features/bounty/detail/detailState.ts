import type { BoardRow, BountyDetail, Person } from '../board/types';

export type DetailAction =
  'apply' | 'applied' | 'closed' | 'taken' | 'selected' | 'notSelected' | 'none';

export type DetailView = {
  id: string;
  title: string;
  category: BountyDetail['category'];
  rewardSen: number;
  placeLabel: string | null;
  distanceM: number | null;
  startsAt: string | null;
  endsAt: string | null;
  deadlineAt: string | null;
  poster: Person;
  description: string | null | undefined;
  action: DetailAction;
  note: string | null;
  address: string | null;
};

const TAKEN = ['assigned', 'en_route', 'done', 'disputed', 'confirmed'];

export const hasOutcome = (detail: BountyDetail) =>
  detail.viewerRole === 'helper' ||
  detail.myApplication?.status === 'selected' ||
  detail.myApplication?.status === 'not_selected';

export function detailAction(detail: BountyDetail, now: Date): DetailAction {
  if (detail.viewerRole === 'helper') return 'selected';
  if (detail.myApplication?.status === 'not_selected') return 'notSelected';
  if (detail.viewerRole === 'poster') return 'none';
  if (detail.myApplication?.status === 'pending') return 'applied';
  if (TAKEN.includes(detail.status)) return 'taken';
  if (detail.status === 'open' && new Date(detail.expiresAt).getTime() > now.getTime()) {
    return 'apply';
  }
  return 'closed';
}

export function viewOfRow(row: BoardRow): DetailView {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    rewardSen: row.rewardSen,
    placeLabel: row.placeLabel,
    distanceM: row.distanceM,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    deadlineAt: row.deadlineAt,
    poster: row.poster,
    description: undefined,
    action: row.appliedByMe ? 'applied' : 'apply',
    note: null,
    address: null,
  };
}

export function viewOfDetail(detail: BountyDetail, now: Date): DetailView {
  const action = detailAction(detail, now);
  return {
    id: detail.id,
    title: detail.title,
    category: detail.category,
    rewardSen: detail.rewardSen,
    placeLabel: detail.place?.label ?? null,
    distanceM: detail.distanceM,
    startsAt: detail.startsAt,
    endsAt: detail.endsAt,
    deadlineAt: detail.deadlineAt,
    poster: detail.poster,
    description: detail.description,
    action,
    note:
      action === 'applied' || action === 'notSelected'
        ? (detail.myApplication?.note ?? null)
        : null,
    address: action === 'selected' ? detail.address : null,
  };
}

export type LocalWrite = { applied: boolean; note: string | null; request: number };

export type DetailState = { request: number; write: LocalWrite | null } & (
  | { kind: 'loading'; seed: BoardRow | null }
  | { kind: 'failed'; seed: BoardRow | null; retrying: boolean }
  | {
      kind: 'ready';
      detail: BountyDetail;
      loadedAt: string;
      refreshing: boolean;
      refreshFailed: boolean;
    }
  | { kind: 'gone' }
);

export type DetailEvent =
  | { type: 'started'; request: number }
  | { type: 'loaded'; request: number; detail: BountyDetail; at: string }
  | { type: 'failed'; request: number }
  | { type: 'gone'; request: number }
  | { type: 'written'; applied: boolean; note: string | null };

export const initialDetail = (seed: BoardRow | null): DetailState => ({
  request: 0,
  write: null,
  kind: 'loading',
  seed,
});

export const keptWrite = (write: LocalWrite | null, answered: number) =>
  write && write.request >= answered ? write : null;

export function withWrite(detail: BountyDetail, write: LocalWrite | null): BountyDetail {
  if (!write || hasOutcome(detail)) return detail;
  if (write.applied) return { ...detail, myApplication: { status: 'pending', note: write.note } };
  return {
    ...detail,
    myApplication: detail.myApplication ? { ...detail.myApplication, status: 'withdrawn' } : null,
  };
}

export function detailReducer(state: DetailState, event: DetailEvent): DetailState {
  const { write } = state;
  if (event.type === 'started') {
    const { request } = event;
    if (state.kind === 'ready') return { ...state, request, refreshing: true };
    if (state.kind === 'gone') return state;
    if (state.kind === 'failed') return { ...state, request, retrying: true };
    return { ...state, request };
  }
  if (event.type === 'written') {
    if (state.kind === 'gone') return state;
    return {
      ...state,
      write: { applied: event.applied, note: event.note, request: state.request },
    };
  }
  if (event.request !== state.request) return state;
  if (event.type === 'loaded') {
    return {
      request: state.request,
      write: hasOutcome(event.detail) ? null : keptWrite(write, event.request),
      kind: 'ready',
      detail: event.detail,
      loadedAt: event.at,
      refreshing: false,
      refreshFailed: false,
    };
  }
  if (event.type === 'gone') return { request: state.request, write: null, kind: 'gone' };
  if (state.kind === 'ready') return { ...state, refreshing: false, refreshFailed: true };
  if (state.kind === 'loading' || state.kind === 'failed') {
    return { request: state.request, write, kind: 'failed', seed: state.seed, retrying: false };
  }
  return state;
}

export function shownView(state: DetailState, now: Date): DetailView | null {
  if (state.kind === 'ready') return viewOfDetail(withWrite(state.detail, state.write), now);
  if (state.kind === 'gone' || !state.seed) return null;
  if (!state.write) return viewOfRow(state.seed);
  const seeded = viewOfRow({ ...state.seed, appliedByMe: state.write.applied });
  return { ...seeded, note: state.write.applied ? state.write.note : null };
}

export const seenMarkDue = (detail: BountyDetail) =>
  detail.viewerRole !== 'helper' && detail.myApplication?.status === 'not_selected';
