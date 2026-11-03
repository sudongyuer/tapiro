import { myRider } from '../detail/settleModel';
import type { RideDetail } from '../detail/types';
import type { MyRide, RideSummary } from '../types';
import type { ReminderRide } from './plan';

const routeOf = (ride: RideSummary) => `${ride.start.short} → ${ride.dest.short}`;

const clockOf = (ride: RideSummary) => ({
  id: ride.id,
  route: routeOf(ride),
  status: ride.status,
  departAt: ride.departAt,
  revisedAt: ride.revisedAt,
  seats: ride.seats,
  taken: ride.taken,
  splitMode: ride.splitMode,
});

export function fromMyRide(ride: MyRide): ReminderRide {
  return {
    ...clockOf(ride),
    organiser: ride.role === 'organiser',
    myStatus: ride.role === 'applicant' ? null : ride.myStatus,
    eta: ride.eta,
    dueSince: ride.myPaid === 'due' ? ride.myDueSince : null,
    share: ride.myShare,
    organiserName: ride.organiserName,
  };
}

export function fromDetail(ride: RideDetail, viewerId: string): ReminderRide | null {
  if (ride.role !== 'organiser' && ride.role !== 'member') return null;
  const mine = myRider(ride, viewerId);
  return {
    ...clockOf(ride),
    organiser: ride.role === 'organiser',
    myStatus: ride.myStatus,
    eta: ride.details?.eta ?? null,
    dueSince: mine?.paid === 'due' ? mine.dueSince : null,
    share: mine?.share ?? ride.myShare,
    organiserName: ride.organiser?.name ?? ride.organiserName,
  };
}
