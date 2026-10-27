import type { Point } from '@/lib/location/types';
import type { BountyCategory } from '@/lib/stickers/category';

export const TIERS = ['new_friend', 'reliable', 'very_reliable', 'tapir_friend'] as const;
export type Tier = (typeof TIERS)[number];

export type Person = { id: string; name: string | null; tier: Tier };

export type BoardRow = {
  id: string;
  title: string;
  category: BountyCategory;
  rewardSen: number;
  placeLabel: string | null;
  stickerPath: string | null;
  startsAt: string | null;
  endsAt: string | null;
  deadlineAt: string | null;
  urgent: boolean;
  distanceM: number | null;
  appliedByMe: boolean;
  createdAt: string;
  poster: Person;
};

export type BoardPage = {
  items: BoardRow[];
  next: unknown | null;
  total?: number;
  restarted?: boolean;
};

export const VIEWER_ROLES = ['poster', 'helper', 'applicant', 'viewer'] as const;
export type ViewerRole = (typeof VIEWER_ROLES)[number];

export const APPLICATION_STATUSES = ['pending', 'withdrawn', 'selected', 'not_selected'] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export type BountyDetail = {
  id: string;
  title: string;
  description: string | null;
  category: BountyCategory;
  rewardSen: number;
  status: string;
  viewerRole: ViewerRole;
  place: { label: string; latitude?: number; longitude?: number } | null;
  distanceM: number | null;
  address: string | null;
  startsAt: string | null;
  endsAt: string | null;
  deadlineAt: string | null;
  expiresAt: string;
  poster: Person;
  myApplication: { status: ApplicationStatus; note: string | null } | null;
};

export type BoardFilter = 'all' | 'urgent' | 'fits_my_time';

export type NoOriginReason = 'undetermined' | 'declined' | 'denied' | 'noFix';

export type BoardOrigin =
  | { kind: 'me'; point: Point }
  | { kind: 'place'; point: Point; label: string }
  | { kind: 'none'; reason: NoOriginReason };

export type LocalWrite = { applied: boolean; generation: number };

export type BoardState = { generation: number; writes: Readonly<Record<string, LocalWrite>> } & (
  | { kind: 'loading' }
  | { kind: 'failed' }
  | {
      kind: 'ready';
      rows: BoardRow[];
      total: number | null;
      next: unknown | null;
      loadedAt: string;
      refreshFailed: boolean;
      page: 'idle' | 'loading' | 'failed';
    }
);

export type ApplyFailure = 'noPayee' | 'closed' | 'taken' | 'gone' | 'own' | 'failed';

export type ApplyOutcome = { ok: true; note: string | null } | { ok: false; reason: ApplyFailure };

export type WithdrawOutcome = { ok: true } | { ok: false; reason: 'notPending' | 'failed' };

export type BoardService = {
  page(origin: BoardOrigin, filter: BoardFilter, after: unknown | null): Promise<BoardPage>;
  detail(id: string, point: Point | null): Promise<BountyDetail | 'gone'>;
  hasPayeeMethod(): Promise<boolean>;
  apply(id: string, note: string | null): Promise<ApplyOutcome>;
  withdraw(id: string): Promise<WithdrawOutcome>;
};

export const originPoint = (origin: BoardOrigin): Point | null =>
  origin.kind === 'none' ? null : origin.point;
