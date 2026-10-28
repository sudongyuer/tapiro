import type { BoardRow, BountyDetail, Person } from '../board/types';

export type DetailAction = 'apply' | 'applied' | 'closed' | 'taken' | 'none';

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
};

const TAKEN = ['assigned', 'en_route', 'done', 'disputed', 'confirmed'];

export function detailAction(detail: BountyDetail, now: Date): DetailAction {
  if (detail.viewerRole === 'poster' || detail.viewerRole === 'helper') return 'none';
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
  };
}

export function viewOfDetail(detail: BountyDetail, now: Date): DetailView {
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
    action: detailAction(detail, now),
  };
}

export type DetailState = { request: number } & (
  | { kind: 'loading'; seed: BoardRow | null }
  | { kind: 'failed'; seed: BoardRow | null }
  | { kind: 'ready'; detail: BountyDetail; refreshing: boolean; refreshFailed: boolean }
  | { kind: 'gone' }
);

export type DetailEvent =
  | { type: 'started'; request: number }
  | { type: 'loaded'; request: number; detail: BountyDetail }
  | { type: 'failed'; request: number }
  | { type: 'gone'; request: number }
  | { type: 'changed'; detail: BountyDetail };

export const initialDetail = (seed: BoardRow | null): DetailState => ({
  request: 0,
  kind: 'loading',
  seed,
});

export function detailReducer(state: DetailState, event: DetailEvent): DetailState {
  if (event.type === 'started') {
    const { request } = event;
    if (state.kind === 'ready') return { ...state, request, refreshing: true };
    if (state.kind === 'gone') return state;
    return { request, kind: 'loading', seed: state.seed };
  }
  if (event.type === 'changed') {
    return state.kind === 'ready' && state.detail.id === event.detail.id
      ? { ...state, detail: event.detail }
      : state;
  }
  if (event.request !== state.request) return state;
  if (event.type === 'loaded') {
    return {
      request: state.request,
      kind: 'ready',
      detail: event.detail,
      refreshing: false,
      refreshFailed: false,
    };
  }
  if (event.type === 'gone') return { request: state.request, kind: 'gone' };
  if (state.kind === 'ready') return { ...state, refreshing: false, refreshFailed: true };
  if (state.kind === 'loading') return { request: state.request, kind: 'failed', seed: state.seed };
  return state;
}

export function shownView(state: DetailState, now: Date): DetailView | null {
  if (state.kind === 'ready') return viewOfDetail(state.detail, now);
  if (state.kind === 'gone') return null;
  return state.seed ? viewOfRow(state.seed) : null;
}
