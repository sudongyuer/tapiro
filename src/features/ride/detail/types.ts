import type { Point } from '@/lib/location';

import type { RideSummary, SplitMode } from '../types';

export const TIERS = ['new_friend', 'reliable', 'very_reliable', 'tapir_friend'] as const;
export type Tier = (typeof TIERS)[number];

export type ViewerRole = 'organiser' | 'member' | 'applicant' | 'viewer' | 'noShow';

export type MemberStatus = 'accepted' | 'boarded' | 'no_show' | 'appealed';

export type RidePerson = { id: string; name: string | null; tier: Tier };

export type RideMember = RidePerson & {
  status: MemberStatus;
  organiser: boolean;
  arrivedAt: string | null;
  lateUntil: string | null;
  lateAt: string | null;
  joinedAt: string | null;
};

export type RideRequest = RidePerson & { note: string | null; requestedAt: string };

export type RideDetails = { meetingNote: string | null; plate: string | null; eta: string | null };

export type RideDetail = RideSummary & {
  role: ViewerRole;
  myStatus: string | null;
  myNote: string | null;
  arrivedAt: string | null;
  lateUntil: string | null;
  organiser: RidePerson | null;
  createdAt: string;
  fullAt: string | null;
  departedAt: string | null;
  reachedAt: string | null;
  appealEndsAt: string | null;
  appealLapsed: boolean;
  noShow: 'waived' | 'counted' | null;
  startPoint: Point;
  details: RideDetails | null;
  members: RideMember[] | null;
  requests: RideRequest[] | null;
};

export type LateChoice = 5 | 10 | 15;

export type RideFailure =
  | 'notFound'
  | 'closed'
  | 'departed'
  | 'full'
  | 'notPending'
  | 'notMember'
  | 'blocked'
  | 'invalid'
  | 'transition'
  | 'failed';

export type RideWrite<T = null> = { ok: true; value: T } | { ok: false; reason: RideFailure };

export type NoShowPreview = { noShow: boolean; waiverAvailable: boolean | null };

export type CancelPreview = NoShowPreview & { refund: boolean };

export type DetailsInput = { plate: string | null; eta: string | null; meetingNote: string | null };

export type RideDetailService = {
  load(id: string): Promise<RideDetail>;
  request(id: string, note: string | null): Promise<RideWrite>;
  withdraw(id: string): Promise<RideWrite>;
  decide(id: string, member: string, approve: boolean): Promise<RideWrite>;
  leavePreview(id: string): Promise<RideWrite<NoShowPreview>>;
  leave(id: string): Promise<RideWrite>;
  cancelPreview(id: string): Promise<RideWrite<CancelPreview>>;
  cancel(id: string): Promise<RideWrite>;
  arrive(id: string): Promise<RideWrite>;
  undoArrive(id: string): Promise<RideWrite>;
  late(id: string, minutes: LateChoice | null): Promise<RideWrite>;
  reviseTime(id: string, departs: string): Promise<RideWrite>;
  updateDetails(id: string, input: DetailsInput): Promise<RideWrite>;
  setSplitMode(id: string, mode: SplitMode): Promise<RideWrite>;
  depart(id: string, boarded: readonly string[]): Promise<RideWrite>;
  appeal(id: string): Promise<RideWrite>;
  confirmAppeal(id: string, member: string): Promise<RideWrite>;
};
