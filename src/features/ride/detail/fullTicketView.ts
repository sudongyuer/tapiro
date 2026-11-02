import type { TFunction } from 'i18next';
import type { SFSymbol } from 'sf-symbols-typescript';

import { formatMoney } from '@/lib/money';

import { malaysiaClock } from '../rideClock';
import { gathersAt } from '../rideTimes';
import { ticketModel, type TicketTone } from '../ticket';
import { statusText, ticketA11y, whenText } from '../ticketView';
import { arrivedCount, activeMembers, countdown, detailPhase } from './detailModel';
import type { RideDetail } from './types';

export type TicketCell = {
  key: string;
  label: string;
  value: string;
  sub: string | null;
  faint: boolean;
};

export type FullTicketView = {
  status: string;
  tone: TicketTone;
  icon: SFSymbol;
  time: string | null;
  oldTime: string | null;
  countdown: { number: string; text: string } | null;
  route: string;
  labels: string | null;
  cells: TicketCell[];
  airport: TicketCell[];
  muted: boolean;
  a11y: string;
};

const ICONS: Record<string, SFSymbol> = {
  leaving: 'clock',
  requests: 'exclamationmark.circle.fill',
  applied: 'hourglass',
  full: 'xmark.circle',
  mine: 'circle',
  need: 'circle',
  departed: 'car',
  arrived: 'flag',
  settling: 'banknote',
  closed: 'checkmark.circle',
  cancelled: 'xmark.circle',
  expired: 'clock.badge.xmark',
};

const cell = (
  key: string,
  label: string,
  value: string,
  sub: string | null = null,
  faint = false,
) => ({
  key,
  label,
  value,
  sub,
  faint,
});

function plateCell(ride: RideDetail, t: TFunction): TicketCell {
  const plate = ride.details?.plate ?? null;
  if (!plate) {
    const name = ride.organiser?.name ?? t('bounty.post.unknownName');
    return cell(
      'plate',
      t('ride.detail.cell.plate'),
      ride.role === 'organiser'
        ? t('ride.detail.cell.plateMine')
        : t('ride.detail.cell.platePending', { name }),
      null,
      true,
    );
  }
  const [number, ...rest] = plate.split('·').map((part) => part.trim());
  return cell('plate', t('ride.detail.cell.plate'), number, rest.join(' · ') || null);
}

export function fullTicketView(
  ride: RideDetail,
  now: number,
  t: TFunction,
  language: string,
): FullTicketView {
  const model = ticketModel(ride, now, {
    role:
      ride.role === 'organiser' ? 'organiser' : ride.role === 'applicant' ? 'applicant' : 'member',
    pendingRequests: ride.requests?.length ?? 0,
  });
  const inside = ride.role === 'organiser' || ride.role === 'member';
  const meetup = inside && detailPhase(ride, now) === 'meetup';
  const when = whenText(model.departs, now, t, language);
  const left = countdown(ride, now);
  const perPerson = model.perPerson
    ? formatMoney(model.perPerson, language, { whole: true })
    : t('ride.ticket.noEstimate');
  const airport = [
    ...(model.airport?.flight != null
      ? [cell('flight', t('ride.detail.cell.flight'), malaysiaClock(model.airport.flight))]
      : []),
    ...(model.airport?.bags
      ? [
          cell(
            'bags',
            t('ride.detail.cell.bags'),
            t('ride.detail.cell.bagsValue', { count: model.airport.bags }),
          ),
        ]
      : []),
  ];
  const cells = meetup
    ? [
        cell('point', t('ride.detail.cell.point'), ride.start.label),
        plateCell(ride, t),
        cell(
          'arrived',
          t('ride.detail.cell.arrived'),
          t('ride.detail.cell.arrivedValue', {
            arrived: arrivedCount(ride),
            total: activeMembers(ride).length,
          }),
        ),
      ]
    : [
        cell('gather', t('ride.detail.cell.gather'), malaysiaClock(gathersAt(ride))),
        cell('seats', t('ride.detail.cell.seats'), `${model.taken}/${model.seats}`),
        cell('perPerson', t('ride.detail.cell.perPerson'), perPerson),
      ];
  const view = {
    status: meetup ? t('ride.detail.meetupStatus') : statusText(model.status, t),
    tone: meetup ? ('urgent' as const) : model.tone,
    icon: meetup ? ('clock' as SFSymbol) : ICONS[model.status.kind],
    time: meetup ? t('ride.detail.meetupWhen', { when }) : when,
    oldTime: ride.revisedAt ? malaysiaClock(Date.parse(ride.departAt)) : null,
    countdown: meetup
      ? {
          number: String(left.minutes),
          text: left.late
            ? t('ride.detail.countdownLate', { count: left.minutes })
            : t('ride.detail.countdown', { count: left.minutes }),
        }
      : null,
    route: t('ride.ticket.route', { from: ride.start.short, to: ride.dest.short }),
    labels: meetup ? null : t('ride.ticket.route', { from: ride.start.label, to: ride.dest.label }),
    cells,
    airport,
    muted: model.muted,
  };
  const parts = [
    view.countdown?.text,
    ticketA11y(
      {
        ...view,
        flight:
          model.airport?.flight != null
            ? t('ride.ticket.flight', { time: malaysiaClock(model.airport.flight) })
            : null,
        bags: model.airport?.bags ? t('ride.ticket.bags', { count: model.airport.bags }) : null,
        amount: perPerson,
        fare: '',
        placeholder: false,
      },
      t,
      model.taken,
      model.seats,
    ),
    view.oldTime ? t('ride.detail.revisedA11y', { time: view.oldTime }) : null,
    ...cells.map((c) => `${c.label} ${c.value}${c.sub ? ` ${c.sub}` : ''}`),
  ];
  return { ...view, a11y: parts.filter(Boolean).join(', ') };
}
