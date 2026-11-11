import type { TFunction } from 'i18next';

import type { BountyDraft } from '@/lib/drafts/bountyDraft';
import { CURRENCIES, formatMoney, type CurrencyCode } from '@/lib/money';

const CLOCK = { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' } as const;
const DAY = { month: 'short', day: 'numeric', weekday: 'short' } as const;

function when(iso: string, language: string, withDay = true) {
  return new Intl.DateTimeFormat(language, withDay ? { ...DAY, ...CLOCK } : CLOCK).format(
    new Date(iso),
  );
}

const sameDay = (a: string, b: string) => new Date(a).toDateString() === new Date(b).toDateString();

export function draftLines(
  draft: BountyDraft,
  t: TFunction,
  language: string,
  currency: CurrencyCode,
): string[] {
  const lines: string[] = [];
  const meta = [
    draft.category ? t(`bounty.category.${draft.category}`) : null,
    draft.rewardMajor === null
      ? null
      : formatMoney(
          {
            minor: draft.rewardMajor * 10 ** CURRENCIES[draft.currency ?? currency].minorDigits,
            currency: draft.currency ?? currency,
          },
          language,
          { whole: true },
        ),
  ].filter((part): part is string => part !== null);
  if (meta.length > 0) lines.push(meta.join(' · '));
  if (draft.time.kind === 'deadline') {
    lines.push(t('ask.sheet.deadline', { when: when(draft.time.deadlineAt, language) }));
  } else if (draft.time.kind === 'window') {
    lines.push(
      t('ask.sheet.window', {
        start: when(draft.time.startsAt, language),
        end: when(draft.time.endsAt, language, !sameDay(draft.time.startsAt, draft.time.endsAt)),
      }),
    );
  }
  if (draft.placeHint) lines.push(t('ask.sheet.place', { place: draft.placeHint }));
  return lines;
}
