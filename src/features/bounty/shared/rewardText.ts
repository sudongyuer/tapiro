import type { TFunction } from 'i18next';

import { formatMoney, type Money, type MoneyReference } from '@/lib/money';

export function rewardText(
  reward: Money,
  reference: MoneyReference | null,
  t: TFunction,
  language: string,
) {
  const amount = formatMoney(reward, language, { whole: true });
  const shown = reference && reference.currency !== reward.currency ? reference : null;
  return {
    reward: amount,
    rewardLabel: t('bounty.post.confirm.rewardLabel', { amount }),
    reference: shown
      ? t('bounty.reference', { amount: formatMoney(shown, language, { whole: true }) })
      : null,
  };
}
