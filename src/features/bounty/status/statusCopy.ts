import type { TFunction } from 'i18next';

import { etaLate, etaTextChangesAt } from '@/lib/etaLate';
import { formatMoney } from '@/lib/money';

import { timeParts } from '../post/timeText';
import { rewardText } from '../shared/rewardText';
import { counterpartName, statusSummary, type TimelineLine, type TimelineStep } from './timeline';
import type { StatusDetail, StatusRole } from './types';

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

export type CopyContext = { t: TFunction; language: string; now: Date };

function statusWhen(iso: string, copy: CopyContext) {
  const parts = timeParts(iso, copy.language, copy.now);
  const day = parts.day ? copy.t(`bounty.post.confirm.${parts.day}`) : parts.date;
  return `${day} ${parts.clock}`;
}

export function statusClock(iso: string, copy: CopyContext) {
  const parts = timeParts(iso, copy.language, copy.now);
  return parts.day === 'today' ? parts.clock : statusWhen(iso, copy);
}

const shownName = (name: string | null | undefined, t: TFunction) =>
  name ?? t('bounty.post.unknownName');

export function currentLine(line: TimelineLine, now: Date): TimelineLine {
  if (line.kind !== 'eta' || !line.params.at) return line;
  const late = etaLate(Date.parse(line.params.at), now.getTime());
  if (!late) return line;
  const key =
    late.unit === 'hours' ? 'bounty.status.note.etaLateHours' : 'bounty.status.note.etaLate';
  return { ...line, key, tone: 'warning' };
}

function lineCount(line: TimelineLine, now: Date) {
  const at = line.params.at ? Date.parse(line.params.at) : null;
  if (at === null) return undefined;
  if (line.kind === 'late') return Math.max(1, Math.floor((now.getTime() - at) / MINUTE_MS));
  if (line.kind === 'eta') return etaLate(at, now.getTime())?.count;
  if (line.kind === 'autoConfirm') return Math.max(1, Math.ceil((at - now.getTime()) / HOUR_MS));
  return undefined;
}

export function lineText(timelineLine: TimelineLine, copy: CopyContext) {
  const line = currentLine(timelineLine, copy.now);
  const { at, name, reason } = line.params;
  const minutes = lineCount(line, copy.now);
  const hours = line.kind === 'late' && minutes !== undefined && minutes >= 60;
  const count = hours ? Math.floor(minutes / 60) : minutes;
  return copy.t(hours ? 'bounty.status.note.lateHours' : line.key, {
    name: shownName(name, copy.t),
    reason: reason ?? '',
    ...(at ? { time: statusClock(at, copy), date: statusWhen(at, copy) } : {}),
    ...(count === undefined ? {} : { count }),
  });
}

export function statusTextChangesAt(detail: StatusDetail, now: number) {
  if (detail.status === 'en_route' && detail.etaAt) {
    return etaTextChangesAt(Date.parse(detail.etaAt), now);
  }
  if (detail.status === 'assigned' && detail.startLate && detail.startsAt) {
    const at = Date.parse(detail.startsAt);
    return at + (Math.floor((now - at) / MINUTE_MS) + 1) * MINUTE_MS;
  }
  return null;
}

export function stepText(step: TimelineStep, copy: CopyContext) {
  return copy.t(step.key, {
    name: shownName(step.params.name, copy.t),
    amount: step.params.amount
      ? formatMoney(step.params.amount, copy.language, { whole: true })
      : '',
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

export function headerReward(detail: StatusDetail, t: TFunction, language: string) {
  return rewardText(
    detail.reward,
    detail.payment ? detail.payment.converted : detail.reference,
    t,
    language,
  );
}
