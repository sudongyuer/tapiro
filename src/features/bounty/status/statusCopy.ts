import type { TFunction } from 'i18next';

import { formatRinggitParts } from '@/lib/money';

import { timeParts } from '../post/timeText';
import { counterpartName, statusSummary, type TimelineLine, type TimelineStep } from './timeline';
import type { StatusDetail, StatusRole } from './types';

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

export type CopyContext = { t: TFunction; language: string; now: Date };

export const statusClock = (iso: string, { language, now }: CopyContext) =>
  timeParts(iso, language, now).clock;

function statusWhen(iso: string, copy: CopyContext) {
  const parts = timeParts(iso, copy.language, copy.now);
  const day = parts.day ? copy.t(`bounty.post.confirm.${parts.day}`) : parts.date;
  return `${day} ${parts.clock}`;
}

const shownName = (name: string | null | undefined, t: TFunction) =>
  name ?? t('bounty.post.unknownName');

function lineCount(line: TimelineLine, now: Date) {
  const at = line.params.at ? Date.parse(line.params.at) : null;
  if (at === null) return undefined;
  if (line.kind === 'late') return Math.max(1, Math.floor((now.getTime() - at) / MINUTE_MS));
  if (line.kind === 'autoConfirm') return Math.max(1, Math.ceil((at - now.getTime()) / HOUR_MS));
  return undefined;
}

export function lineText(line: TimelineLine, copy: CopyContext) {
  const { at, name, reason } = line.params;
  const count = lineCount(line, copy.now);
  return copy.t(line.key, {
    name: shownName(name, copy.t),
    reason: reason ?? '',
    ...(at ? { time: statusClock(at, copy), date: statusWhen(at, copy) } : {}),
    ...(count === undefined ? {} : { count }),
  });
}

export function bareAmount(sen: number, language: string) {
  const { whole, cents } = formatRinggitParts(sen, language);
  return /^[.,]00$/.test(cents) ? whole : `${whole}${cents}`;
}

export function stepText(step: TimelineStep, copy: CopyContext) {
  return copy.t(step.key, {
    name: shownName(step.params.name, copy.t),
    amount: bareAmount(step.params.sen ?? 0, copy.language),
  });
}

export function etaChangedText(detail: StatusDetail, role: StatusRole, copy: CopyContext) {
  if (detail.status !== 'en_route' || !detail.previousEtaAt) return null;
  const changed = detail.events.findLast((event) => event.kind === 'eta_changed');
  if (!changed) return null;
  const time = statusClock(changed.at, copy);
  if (changed.actor === role) return copy.t('bounty.eta.changedSelf', { time });
  return copy.t('bounty.eta.changed', {
    name: shownName(counterpartName(detail, role), copy.t),
    time,
  });
}

export function summaryText(detail: StatusDetail, role: StatusRole, t: TFunction) {
  if (detail.status === 'closed') return t('bounty.select.closed');
  const summary = statusSummary(detail, role);
  if (!summary) return null;
  return t(summary.key, { name: shownName(summary.params.name, t) });
}

export function stepLabel(step: TimelineStep, parts: (string | null)[], copy: CopyContext) {
  const separator = copy.language.startsWith('zh') ? '，' : ', ';
  return copy.t('bounty.status.a11y.step', {
    label: parts.filter(Boolean).join(separator),
    state: copy.t(`bounty.status.a11y.${step.state}`),
  });
}
