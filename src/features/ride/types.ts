import type { PlaceKind } from '@/features/place/shortName';
import type { Point } from '@/lib/location';
import type { CurrencyCode, Money } from '@/lib/money';

export type RidePhase =
  'open' | 'gathering' | 'departed' | 'arrived' | 'settling' | 'closed' | 'cancelled' | 'expired';

export type SplitMode = 'tapiro' | 'grab';

export type RidePlace = { label: string; short: string; kind: PlaceKind | null };

export type RideSummary = {
  id: string;
  start: RidePlace;
  dest: RidePlace;
  departAt: string;
  revisedAt: string | null;
  day: string;
  status: RidePhase;
  seats: number;
  taken: number;
  splitMode: SplitMode;
  estimate: Money | null;
  airport: boolean;
  flightDepartsAt: string | null;
  largeBags: number | null;
  settledAt: string | null;
  organiserName: string | null;
};

export type RideRole = 'organiser' | 'member' | 'applicant';

export type MyRide = RideSummary & {
  role: RideRole;
  myStatus: string;
  pendingRequests: number;
};

export type NearbyCursor = { id: string; latitude: number | null; longitude: number | null };

export type NearbyPage = { items: RideSummary[]; next: NearbyCursor | null };

export type MyRides = { items: MyRide[]; historyCount: number };

export type RideListData = {
  mine: MyRide[];
  joinable: RideSummary[];
  historyCount: number;
  next: NearbyCursor | null;
};

export type ShortNameRow = { pattern: string; shortName: string; kind: PlaceKind | null };

export type RidePostStatus = {
  blocked: boolean;
  coins: number;
  freePostsLeft: number;
  freePostsPerMonth: number;
  nextFreeAt: string;
  hasPayee: boolean;
};

export type PublishRideArgs = {
  id: string;
  start_label: string;
  start_short: string;
  start_latitude: number;
  start_longitude: number;
  dest_label: string;
  dest_short: string;
  dest_latitude: number;
  dest_longitude: number;
  depart_at: string;
  seats: number;
  currency: CurrencyCode;
  split_mode: SplitMode;
  estimate_minor: number | null;
  flight_departs_at: string | null;
  large_bags: number | null;
  meeting_note: string | null;
};

export type PublishRideFailure =
  'blocked' | 'noBalance' | 'noPayee' | 'invalid' | 'alreadySent' | 'failed';

export type PublishRideOutcome =
  { ok: true; id: string; charge: 'free' | 'coin' } | { ok: false; reason: PublishRideFailure };

export type RideService = {
  nearby(point: Point | null, after: NearbyCursor | null): Promise<NearbyPage>;
  mine(): Promise<MyRides>;
  history(): Promise<RideSummary[]>;
  shortNames(): Promise<ShortNameRow[]>;
  postStatus(): Promise<RidePostStatus>;
  publish(args: PublishRideArgs): Promise<PublishRideOutcome>;
};
