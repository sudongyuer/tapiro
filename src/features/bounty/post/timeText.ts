import type { TFunction } from 'i18next';

import { malaysiaDay } from './cost';
import type { TimeChoice } from './types';

const DAY_MS = 86_400_000;

function dayStart(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start.getTime();
}

export type TimeParts = { day: 'today' | 'tomorrow' | null; date: string; clock: string };

export function timeParts(iso: string, language: string, now: Date): TimeParts {
  const at = new Date(iso);
  const offset = Math.round((dayStart(at) - dayStart(now)) / DAY_MS);
  return {
    day: offset === 0 ? 'today' : offset === 1 ? 'tomorrow' : null,
    date: new Intl.DateTimeFormat(language, {
      month: 'short',
      day: 'numeric',
      weekday: 'short',
    }).format(at),
    clock: new Intl.DateTimeFormat(language, {
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(at),
  };
}

export function malaysiaDate(iso: string, language: string) {
  const { year, month, day } = malaysiaDay(iso);
  return new Intl.DateTimeFormat(language, {
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function timeLine(time: TimeChoice, t: TFunction, language: string, now: Date) {
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
