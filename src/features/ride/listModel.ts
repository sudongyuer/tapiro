import { dayRelation, type DayRelation } from './rideClock';
import type { RideListData, RideSummary } from './types';

export type DayGroup = { day: string; relation: DayRelation; rides: RideSummary[] };

export type RideListModel = {
  mine: RideListData['mine'];
  days: DayGroup[];
  historyCount: number;
  empty: boolean;
};

export function groupByDay(rides: readonly RideSummary[], now: number): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const ride of rides) {
    const last = groups.at(-1);
    if (last && last.day === ride.day) last.rides.push(ride);
    else groups.push({ day: ride.day, relation: dayRelation(ride.day, now), rides: [ride] });
  }
  return groups;
}

export function rideListModel(data: RideListData, now: number): RideListModel {
  const mineIds = new Set(data.mine.map((ride) => ride.id));
  const joinable = data.joinable.filter((ride) => !mineIds.has(ride.id));
  return {
    mine: data.mine,
    days: groupByDay(joinable, now),
    historyCount: data.historyCount,
    empty: data.mine.length === 0 && joinable.length === 0 && data.historyCount === 0,
  };
}

export function mergePage(
  data: RideListData,
  page: { items: RideSummary[]; next: RideListData['next'] },
) {
  const seen = new Set(data.joinable.map((ride) => ride.id));
  return {
    ...data,
    joinable: [...data.joinable, ...page.items.filter((ride) => !seen.has(ride.id))],
    next: page.next,
  };
}
