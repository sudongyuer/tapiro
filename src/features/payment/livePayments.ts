import type { TFunction } from 'i18next';

import type { AccessoryItem } from '@/lib/liveItems';

import type { Payment } from './types';

export function accessoryFor(payment: Payment, t: TFunction): AccessoryItem | null {
  const name = payment.counterpartName;
  const base = {
    id: payment.id,
    amountSen: payment.amountSen,
    payment: { id: payment.id, counterpart: name, note: payment.title },
  };
  if (payment.role === 'payer') {
    const nudged = payment.state === 'marked_paid' && payment.nudgedAt !== null;
    if (payment.state !== 'due' && !nudged) return null;
    return {
      ...base,
      kind: 'oweMoney',
      title: t('pay.live.owe', { name }),
      sub: nudged ? t('pay.live.notReceived', { title: payment.title, name }) : payment.title,
    };
  }
  if (payment.state === 'marked_paid')
    return {
      ...base,
      kind: 'owedToYou',
      title: t('pay.live.saysPaid', { name }),
      sub: t('pay.live.confirm', { title: payment.title }),
    };
  if (payment.state === 'due')
    return {
      ...base,
      kind: 'owedToYou',
      title: t('pay.live.waiting', { name }),
      sub: payment.title,
    };
  return null;
}

export function accessoryItems(payments: readonly Payment[], t: TFunction) {
  return payments.flatMap((payment) => accessoryFor(payment, t) ?? []);
}
