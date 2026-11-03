import type { TFunction } from 'i18next';
import type { SFSymbol } from 'sf-symbols-typescript';

import { CURRENCIES, formatMoney, type Money } from '@/lib/money';
import { localClock, localDayKey } from '@/lib/deviceClock';

import { dayKeyDate, dayRelation } from './rideClock';
import { ticketModel, type TicketMine, type TicketStatus, type TicketTone } from './ticket';
import type { RideSummary } from './types';

export type TicketView = {
  status: string;
  tone: TicketTone;
  icon: SFSymbol;
  time: string | null;
  route: string;
  labels: string | null;
  flight: string | null;
  bags: string | null;
  amount: string;
  fare: string;
  muted: boolean;
  placeholder: boolean;
  a11y: string;
};

const ICONS: Record<TicketStatus['kind'], SFSymbol> = {
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

export function statusText(status: TicketStatus, t: TFunction) {
  switch (status.kind) {
    case 'leaving':
      return t('ride.ticket.leaving', { count: status.minutes });
    case 'requests':
      return t('ride.ticket.requests', { count: status.count });
    case 'mine':
      return t('ride.ticket.mine', { count: status.need });
    case 'need':
      return t('ride.ticket.need', { count: status.need });
    default:
      return t(`ride.ticket.${status.kind}`);
  }
}

export function dayText(dayKey: string, now: number, t: TFunction, language: string) {
  const relation = dayRelation(dayKey, now);
  if (relation !== 'other') return t(`ride.list.${relation}`);
  return new Intl.DateTimeFormat(language, {
    month: 'short',
    day: 'numeric',
    weekday: 'short',
    timeZone: 'UTC',
  }).format(dayKeyDate(dayKey));
}

export function whenText(time: number, now: number, t: TFunction, language: string) {
  return t('ride.ticket.time', {
    day: dayText(localDayKey(time), now, t, language),
    clock: localClock(time),
  });
}

export function emptyAmount(currency: Money['currency']) {
  return `${CURRENCIES[currency].symbol} –`;
}

export function ticketA11y(
  view: Omit<TicketView, 'a11y'>,
  t: TFunction,
  taken: number,
  seats: number,
  fare?: string,
) {
  const parts = [
    [view.status, view.time, view.route, view.labels]
      .filter(Boolean)
      .join(t('ride.ticket.a11ySeparator')),
    view.flight,
    view.bags,
    fare ?? t('ride.ticket.a11yFare', { amount: view.amount, taken, seats }),
  ];
  return parts.filter(Boolean).join(', ');
}

function shareStub(ride: RideSummary, mine: TicketMine | null, t: TFunction, language: string) {
  const share = mine?.myShare;
  if (!share || (ride.status !== 'settling' && ride.status !== 'closed')) return null;
  const fare =
    mine.role === 'organiser'
      ? t('rideSettle.list.yours')
      : mine.myPaid === 'paid' || mine.myPaid === 'settled'
        ? t('rideSettle.list.youPaid')
        : mine.myPaid === 'due'
          ? t('rideSettle.list.youPay')
          : null;
  if (!fare) return null;
  const amount = formatMoney(share, language);
  return { amount, fare, a11yFare: `${fare} ${amount}` };
}

export function rideTicketView(
  ride: RideSummary,
  options: { now: number; mine?: TicketMine | null; showDay: boolean },
  t: TFunction,
  language: string,
): TicketView {
  const model = ticketModel(ride, options.now, options.mine ?? null);
  const stub = shareStub(ride, options.mine ?? null, t, language);
  const time = options.showDay
    ? whenText(model.departs, options.now, t, language)
    : localClock(model.departs);
  const view = {
    status: statusText(model.status, t),
    tone: model.tone,
    icon: ICONS[model.status.kind],
    time,
    route: t('ride.ticket.route', { from: ride.start.short, to: ride.dest.short }),
    labels: t('ride.ticket.route', { from: ride.start.label, to: ride.dest.label }),
    flight:
      model.airport?.flight != null
        ? t('ride.ticket.flight', { time: localClock(model.airport.flight) })
        : null,
    bags: model.airport?.bags ? t('ride.ticket.bags', { count: model.airport.bags }) : null,
    ...(stub
      ? { amount: stub.amount, fare: stub.fare }
      : {
          amount: model.perPerson
            ? formatMoney(model.perPerson, language, { whole: true })
            : t('ride.ticket.noEstimate'),
          fare: t('ride.ticket.perPerson', { taken: model.taken, seats: model.seats }),
        }),
    muted: model.muted,
    placeholder: false,
  };
  return { ...view, a11y: ticketA11y(view, t, model.taken, model.seats, stub?.a11yFare) };
}
