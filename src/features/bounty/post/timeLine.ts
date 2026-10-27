import { useI18n } from '@/lib/i18n';

import { timeParts, type TimeParts } from './timeText';
import type { TimeChoice } from './types';

export function useTimeLine(time: TimeChoice) {
  const { t, language } = useI18n();
  const now = new Date();
  const when = (parts: TimeParts) =>
    `${parts.day ? t(`bounty.post.confirm.${parts.day}`) : parts.date} ${parts.clock}`;
  if (time.kind === 'deadline') {
    return t('bounty.post.confirm.deadlineAt', {
      when: when(timeParts(time.deadlineAt, language, now)),
    });
  }
  if (time.kind === 'window') {
    const start = timeParts(time.startsAt, language, now);
    const end = timeParts(time.endsAt, language, now);
    const sameDay = start.date === end.date;
    return t('bounty.post.confirm.windowAt', {
      start: when(start),
      end: sameDay ? end.clock : when(end),
    });
  }
  return null;
}
