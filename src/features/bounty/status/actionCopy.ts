import type { TFunction } from 'i18next';

import { formatMoney, type Money } from '@/lib/money';

import { malaysiaDate } from '../post/timeText';
import { codePoints } from '../post/validate';
import type { SheetCopy } from '../shared/askSheet';
import { ISSUE_REASON_MAX, type CancelPreview, type PostCharge, type StatusRole } from './types';

type Copy = { t: TFunction; language: string };

export function cancelSheetCopy(
  preview: CancelPreview,
  role: StatusRole,
  name: string,
  { t, language }: Copy,
): SheetCopy {
  const poster = role === 'poster';
  const side = poster ? 'Poster' : 'Helper';
  const message = (() => {
    if (preview.offender === 'other') return t('bounty.cancel.otherLate', { name });
    if (preview.waiverAvailable) return t(`bounty.cancel.waiver${side}`, { name });
    if (!preview.waiverBackAt) return t(`bounty.cancel.counted${side}Undated`, { name });
    return t(`bounty.cancel.counted${side}`, {
      name,
      date: malaysiaDate(preview.waiverBackAt, language),
    });
  })();
  return {
    title: t(`bounty.cancel.title${side}`),
    message,
    confirm: t(`bounty.cancel.confirm${side}`),
    keep: t(`bounty.cancel.keep${side}`),
  };
}

export function closeSheetCopy(
  charge: PostCharge,
  applicants: number | null,
  t: TFunction,
): SheetCopy {
  const message =
    applicants && applicants > 0
      ? t(`bounty.close.${charge}`, { count: applicants })
      : t(`bounty.close.${charge}None`);
  return {
    title: t('bounty.close.title'),
    message,
    confirm: t('bounty.close.confirm'),
    keep: t('bounty.close.keep'),
  };
}

export function confirmSheetCopy(name: string, reward: Money, { t, language }: Copy): SheetCopy {
  return {
    title: t('bounty.confirm.title', { name }),
    message: t('bounty.confirm.body', {
      name,
      amount: formatMoney(reward, language, { whole: true }),
    }),
    confirm: t('bounty.confirm.confirm'),
    keep: t('bounty.confirm.cancel'),
  };
}

export const issueCount = (text: string) => codePoints(text.trim());

export const issueReady = (text: string) => {
  const count = issueCount(text);
  return count > 0 && count <= ISSUE_REASON_MAX;
};
