import type { TFunction } from 'i18next';

import { formatMoney } from '@/lib/money';
import { localClock } from '@/lib/deviceClock';

import { whenText } from '../ticketView';
import type { TicketCell } from './fullTicketView';
import { equalShares, myRider, owedDays, paidCount } from './settleModel';
import type { RideDetail } from './types';

export type SettleTicket = {
  status: string;
  time: string | null;
  lead: { number: string; text: string } | null;
  cells: TicketCell[];
  stamp: boolean;
};

const cell = (key: string, label: string, value: string, sub: string | null = null) => ({
  key,
  label,
  value,
  sub,
  faint: false,
});

export function settleTicket(
  ride: RideDetail,
  viewerId: string,
  now: number,
  t: TFunction,
  language: string,
): SettleTicket | null {
  const inside = ride.role === 'organiser' || ride.myStatus === 'boarded';
  if (!inside) return null;
  const organiser = ride.role === 'organiser';
  const name = ride.organiser?.name ?? t('bounty.post.unknownName');
  const money = (value: Parameters<typeof formatMoney>[0]) => formatMoney(value, language);
  const reached = ride.reachedAt ? Date.parse(ride.reachedAt) : null;
  const departed = ride.departedAt ? Date.parse(ride.departedAt) : null;
  const settle = ride.settle;
  const mine = myRider(ride, viewerId);
  const people = ride.taken;
  const boardCells = [
    cell('plate', t('ride.detail.cell.plate'), ride.details?.plate?.split('·')[0]?.trim() || '–'),
    cell('seats', t('ride.detail.cell.seats'), `${ride.taken}/${ride.seats}`),
    reached
      ? cell('reached', t('rideSettle.ticket.reached'), localClock(reached))
      : cell(
          'eta',
          t('rideSettle.ticket.eta'),
          ride.details?.eta ? localClock(Date.parse(ride.details.eta)) : '–',
        ),
  ];

  if (ride.status === 'departed') {
    return {
      status: t('rideSettle.ticket.onboard'),
      time: departed ? t('rideSettle.ticket.departedAt', { time: localClock(departed) }) : null,
      lead: null,
      cells: boardCells,
      stamp: false,
    };
  }
  const arrivedAt = reached ? t('rideSettle.ticket.arrivedAt', { time: localClock(reached) }) : '';

  if (ride.status === 'arrived' || (ride.status === 'settling' && !settle)) {
    return {
      status: arrivedAt,
      time: null,
      lead: {
        number: '',
        text: organiser
          ? t('rideSettle.ticket.leadSplit')
          : t('rideSettle.ticket.leadWait', { name }),
      },
      cells: boardCells,
      stamp: false,
    };
  }

  if (ride.status === 'closed') {
    const grab = ride.splitMode === 'grab';
    const settledAt = ride.settledAt ? Date.parse(ride.settledAt) : now;
    const youPaid = !organiser && mine ? money(mine.share) : null;
    return {
      status: grab
        ? t('rideSettle.ticket.closedGrab', { time: reached ? localClock(reached) : '' })
        : t('rideSettle.ticket.closedAt', { time: whenText(settledAt, now, t, language) }),
      time: null,
      lead: {
        number: '',
        text: t(grab ? 'rideSettle.ticket.leadGrab' : 'rideSettle.ticket.leadDone'),
      },
      cells: grab
        ? [
            cell('fare', t('rideSettle.ticket.fare'), t('rideSettle.ticket.fareGrab')),
            cell('reached', t('rideSettle.ticket.reached'), reached ? localClock(reached) : '–'),
          ]
        : !settle
          ? [cell('reached', t('rideSettle.ticket.reached'), reached ? localClock(reached) : '–')]
          : [
              cell('total', t('rideSettle.ticket.total'), money(settle.total)),
              youPaid
                ? cell('youPaid', t('rideSettle.ticket.youPaid'), youPaid)
                : ride.myShare
                  ? cell('yours', t('rideSettle.ticket.yours'), money(ride.myShare))
                  : null,
            ].filter((item) => item !== null),
      stamp: true,
    };
  }

  if (ride.status !== 'settling' || !settle) return null;
  if (organiser) {
    const count = paidCount(ride);
    const each = equalShares(ride) ? settle.riders[0]?.share : null;
    return {
      status: arrivedAt,
      time: null,
      lead: {
        number: `${count.received}/${count.total}`,
        text: t('rideSettle.ticket.leadReceived'),
      },
      cells: [
        each
          ? cell('each', t('rideSettle.ticket.each'), money(each))
          : cell('total', t('rideSettle.ticket.total'), money(settle.total)),
        cell('yours', t('rideSettle.ticket.yours'), ride.myShare ? money(ride.myShare) : '–'),
      ],
      stamp: false,
    };
  }
  if (!mine) return null;
  const days = owedDays(mine, now);
  const lead =
    mine.paid === 'settled'
      ? { number: '', text: t('rideSettle.ticket.leadMineSettled') }
      : {
          number: money(mine.share),
          text:
            mine.paid === 'paid'
              ? t('rideSettle.ticket.leadPaid', { name })
              : days > 0
                ? t('rideSettle.ticket.leadOwe', { name })
                : t('rideSettle.ticket.leadPay', { name }),
        };
  return {
    status:
      days > 0 && reached
        ? t('rideSettle.ticket.owing', { when: whenText(reached, now, t, language) })
        : arrivedAt,
    time: null,
    lead,
    cells: [
      cell('total', t('rideSettle.ticket.total'), money(settle.total)),
      days > 0
        ? cell(
            'owed',
            t('rideSettle.ticket.owed'),
            t('rideSettle.ticket.owedValue', { count: days }),
          )
        : cell(
            'split',
            t('rideSettle.ticket.split'),
            t('rideSettle.ticket.splitValue', { count: people }),
          ),
      cell('you', t('rideSettle.ticket.you'), t(`rideSettle.paid.${mine.paid}`)),
    ],
    stamp: false,
  };
}
