import type { TFunction } from 'i18next';

import { CURRENCIES, formatMoney, type DecimalSeparator } from '@/lib/money';

import { perPersonAbout } from '../perPerson';
import { emptyAmount, ticketA11y, whenText, type TicketView } from '../ticketView';
import type { RideDraft } from './draft';
import { parseEstimate } from './validate';

export function draftPerPerson(draft: RideDraft, decimal: DecimalSeparator = '.') {
  const estimate = parseEstimate(draft.estimateText, draft.currency, decimal);
  if (!estimate || estimate.minor <= 0) return null;
  const digits = CURRENCIES[draft.currency].minorDigits;
  return { minor: perPersonAbout(estimate.minor, draft.seats, digits), currency: draft.currency };
}

export function flightLine(draft: RideDraft, t: TFunction) {
  return draft.airportOpen && draft.flightClock
    ? t('ride.ticket.flight', { time: draft.flightClock })
    : null;
}

export function bagsLine(draft: RideDraft, t: TFunction) {
  return draft.airportOpen && draft.largeBags > 0
    ? t('ride.ticket.bags', { count: draft.largeBags })
    : null;
}

export function draftTicketView(
  draft: RideDraft,
  now: number,
  t: TFunction,
  language: string,
  decimal: DecimalSeparator = '.',
): TicketView {
  const { start, dest } = draft;
  const routed = start !== null && dest !== null;
  const each = draftPerPerson(draft, decimal);
  const view = {
    status: t('ride.ticket.need', { count: draft.seats - 1 }),
    tone: 'plain' as const,
    icon: 'circle' as const,
    time: draft.departAt
      ? whenText(Date.parse(draft.departAt), now, t, language)
      : t('ride.create.form.liveTime'),
    route: routed
      ? t('ride.ticket.route', { from: start.short, to: dest.short })
      : t('ride.create.form.liveRoute'),
    labels: routed
      ? t('ride.ticket.route', { from: start.label, to: dest.label })
      : t('ride.create.form.liveHint'),
    flight: flightLine(draft, t),
    bags: bagsLine(draft, t),
    amount: each ? formatMoney(each, language, { whole: true }) : emptyAmount(draft.currency),
    fare: t('ride.ticket.perPerson', { taken: 1, seats: draft.seats }),
    muted: false,
    placeholder: !routed,
  };
  return { ...view, a11y: ticketA11y(view, t, 1, draft.seats) };
}
