import type { RidePhase } from '../types';
import type { FixtureDetailOptions } from './fixtureDetailService';
import { FIXTURE_VIEWER } from './fixtureDetails';
import type {
  ReceivedResult,
  RideDetail,
  RideDetailService,
  RideWrite,
  SettleRider,
} from './types';

type Deps = {
  options: FixtureDetailOptions;
  current: (id: string) => RideDetail;
  update: (id: string, patch: (ride: RideDetail) => Partial<RideDetail>) => void;
  answer: <T>(name: string, args: unknown, apply: () => T) => Promise<RideWrite<T>>;
  write: (name: string, args: unknown, apply: () => void) => Promise<RideWrite>;
  wait: () => Promise<unknown>;
  onCall: (name: string, args: unknown) => void;
};

const iso = (time: number) => new Date(time).toISOString();

const boardedRiders = (ride: RideDetail) =>
  (ride.members ?? []).filter((m) => m.status === 'boarded' && !m.organiser);

function closed(ride: RideDetail, now: number): Partial<RideDetail> {
  return {
    status: 'closed',
    settledAt: iso(now),
    sticker: boardedRiders(ride).length > 0 ? { id: `sticker-${ride.id}`, collected: false } : null,
  };
}

function withRider(
  ride: RideDetail,
  member: string,
  change: (rider: SettleRider) => SettleRider,
): Partial<RideDetail> {
  if (!ride.settle) return {};
  return {
    settle: {
      ...ride.settle,
      riders: ride.settle.riders.map((rider) => (rider.id === member ? change(rider) : rider)),
    },
  };
}

export function settleWrites({
  options,
  current,
  update,
  answer,
  write,
  wait,
  onCall,
}: Deps): Pick<
  RideDetailService,
  | 'reach'
  | 'sendSplit'
  | 'uploadReceipt'
  | 'receiptUrl'
  | 'dispute'
  | 'changeShare'
  | 'confirmReceived'
  | 'notReceived'
  | 'collectSticker'
> {
  let receiptFailed = false;
  return {
    reach: (id) =>
      answer('reach', { id }, (): RidePhase => {
        const ride = current(id);
        const now = options.now();
        const ends = ride.splitMode === 'grab' || boardedRiders(ride).length === 0;
        update(id, () => ({
          reachedAt: iso(now),
          ...(ends ? closed(ride, now) : { status: 'arrived' }),
        }));
        return current(id).status;
      }),
    sendSplit: (id, input) =>
      write('sendSplit', { id, ...input }, () =>
        update(id, (ride) => {
          const { currency } = ride;
          const sum = input.shares.reduce((total, share) => total + share.minor, 0);
          const now = options.now();
          const organiserShare = { minor: input.totalMinor - sum, currency };
          return {
            status: 'settling',
            myShare: organiserShare,
            settle: {
              total: { minor: input.totalMinor, currency },
              organiserShare,
              sentAt: iso(now),
              receipt: input.receipt,
              riders: boardedRiders(ride).map((m) => ({
                id: m.id,
                name: m.name,
                tier: m.tier,
                share: {
                  minor: input.shares.find((share) => share.memberId === m.id)?.minor ?? 0,
                  currency,
                },
                paid: 'due',
                paymentId: `fixture-split-${m.id}`,
                methodType: null,
                markedPaidAt: null,
                settledAt: null,
                hasProof: false,
                dueSince: iso(now),
                dispute: null,
              })),
            },
          };
        }),
      ),
    async uploadReceipt(id, fileUri) {
      onCall('uploadReceipt', { id, fileUri });
      await wait();
      if (options.fail === 'receipt' && !receiptFailed) {
        receiptFailed = true;
        throw new Error('fixture: receipt upload failed');
      }
      return `${id}/fixture-receipt.jpg`;
    },
    async receiptUrl() {
      const uri = (await options.receiptImage?.()) ?? null;
      if (!uri) throw new Error('fixture: no receipt image');
      return uri;
    },
    dispute: (id, note) =>
      write('dispute', { id, note }, () =>
        update(id, (ride) =>
          withRider(ride, FIXTURE_VIEWER, (rider) => ({
            ...rider,
            dispute: { note, at: iso(options.now()) },
          })),
        ),
      ),
    changeShare: (id, member, minor) =>
      write('changeShare', { id, member, minor }, () =>
        update(id, (ride) => {
          const changed = withRider(ride, member, (rider) => ({
            ...rider,
            share: { ...rider.share, minor },
            dispute: null,
          }));
          const settle = changed.settle;
          if (!settle) return {};
          const others = settle.riders.reduce((total, rider) => total + rider.share.minor, 0);
          const organiserShare = { ...settle.total, minor: settle.total.minor - others };
          return { settle: { ...settle, organiserShare }, myShare: organiserShare };
        }),
      ),
    confirmReceived: (id, paymentId) =>
      answer('confirmReceived', { id, paymentId }, (): ReceivedResult => {
        const ride = current(id);
        const now = options.now();
        const rider = ride.settle?.riders.find((r) => r.paymentId === paymentId);
        if (!rider || !ride.settle)
          return { rideSettled: false, firstSettled: false, stickerCount: null };
        const next = withRider(ride, rider.id, (r) => ({
          ...r,
          paid: 'settled',
          settledAt: iso(now),
        }));
        const done = next.settle?.riders.every((r) => r.paid === 'settled') ?? false;
        update(id, () => ({ ...next, ...(done ? closed(ride, now) : {}) }));
        return { rideSettled: done, firstSettled: done, stickerCount: done ? 1 : null };
      }),
    notReceived: (id, paymentId) => write('notReceived', { id, paymentId }, () => undefined),
    collectSticker: (id, stickerId) =>
      write('collectSticker', { id, stickerId }, () =>
        update(id, (ride) => ({ sticker: ride.sticker && { ...ride.sticker, collected: true } })),
      ),
  };
}
