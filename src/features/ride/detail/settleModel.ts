import type { Money } from '@/lib/money';

import type { RideDetail, SettleRider } from './types';

const DAY = 24 * 3_600_000;

export type SettleFooter =
  | { kind: 'reach'; grab: boolean }
  | { kind: 'split' }
  | { kind: 'waitSplit' }
  | { kind: 'pay'; share: Money; paymentId: string; disputed: boolean }
  | { kind: 'paid'; paymentId: string }
  | { kind: 'mineSettled' };

export function myRider(ride: RideDetail, viewerId: string): SettleRider | null {
  return ride.settle?.riders.find((rider) => rider.id === viewerId) ?? null;
}

export function settleFooter(ride: RideDetail, viewerId: string): SettleFooter | null {
  const organiser = ride.role === 'organiser';
  if (ride.role !== 'organiser' && ride.role !== 'member') return null;
  if (ride.role === 'member' && ride.myStatus !== 'boarded') return null;
  switch (ride.status) {
    case 'departed':
      return organiser ? { kind: 'reach', grab: ride.splitMode === 'grab' } : { kind: 'waitSplit' };
    case 'arrived':
      return organiser ? { kind: 'split' } : { kind: 'waitSplit' };
    case 'settling': {
      if (organiser) return null;
      const mine = myRider(ride, viewerId);
      if (!mine?.paymentId) return null;
      if (mine.paid === 'settled') return { kind: 'mineSettled' };
      if (mine.paid === 'paid') return { kind: 'paid', paymentId: mine.paymentId };
      return {
        kind: 'pay',
        share: mine.share,
        paymentId: mine.paymentId,
        disputed: mine.dispute !== null,
      };
    }
    default:
      return null;
  }
}

export function owedDays(rider: SettleRider | null, now: number) {
  if (!rider?.dueSince || rider.paid !== 'due') return 0;
  return Math.max(0, Math.floor((now - Date.parse(rider.dueSince)) / DAY));
}

export function paidCount(ride: RideDetail) {
  const riders = ride.settle?.riders ?? [];
  return {
    paid: riders.filter((rider) => rider.paid !== 'due').length,
    received: riders.filter((rider) => rider.paid === 'settled').length,
    waiting: riders.filter((rider) => rider.paid === 'paid').length,
    total: riders.length,
  };
}

export const equalShares = (ride: RideDetail) => {
  const riders = ride.settle?.riders ?? [];
  return riders.length > 0 && riders.every((rider) => rider.share.minor === riders[0].share.minor);
};
