import type { TFunction } from 'i18next';

import type { AccessoryItem, BountyCardDetail, BountyCardKind } from '@/lib/liveItems';

import { timeParts } from '../post/timeText';
import { sentence } from '../shared/sentence';
import type { LiveAction, LiveRow, SeenCard } from './types';

export type BountyLiveItem = AccessoryItem & { kind: BountyCardKind; bounty: BountyCardDetail };

export type MarkSeen = (bountyId: string, card: SeenCard) => Promise<void>;

export type LiveCopy = { t: TFunction; language: string; now: Date; markSeen: MarkSeen };

const ACTION_LABEL = {
  choose: 'bounty.live.action.choose',
  start: 'bounty.live.action.start',
  confirm: 'bounty.live.action.confirm',
  resolveIssue: 'bounty.live.action.handle',
} as const satisfies Record<LiveAction, string>;

type Line = { line: string; target: 'applicants' | 'status' | 'detail' };

function when(iso: string, copy: LiveCopy) {
  const parts = timeParts(iso, copy.language, copy.now);
  const day = parts.day ? copy.t(`bounty.post.confirm.${parts.day}`) : parts.date;
  return `${day} ${parts.clock}`;
}

function clock(iso: string, copy: LiveCopy) {
  const parts = timeParts(iso, copy.language, copy.now);
  return parts.day === 'today' ? parts.clock : when(iso, copy);
}

function posterLine(row: LiveRow, name: string, copy: LiveCopy): Line | null {
  const { t } = copy;
  const status = (line: string): Line => ({ line, target: 'status' });
  if (row.card === 'expired') {
    const key =
      row.refund === 'coin' ? 'bounty.live.poster.expiredCoin' : 'bounty.live.poster.expiredFree';
    return { line: t(key), target: 'detail' };
  }
  switch (row.status) {
    case 'open': {
      const count = row.applicantCount ?? 0;
      return {
        line:
          count > 0 ? t('bounty.live.poster.applicants', { count }) : t('bounty.live.poster.open'),
        target: 'applicants',
      };
    }
    case 'assigned':
      if (row.startLate) return status(t('bounty.live.poster.late', { name }));
      return status(
        row.startsAt
          ? t('bounty.live.poster.assigned', { name, time: clock(row.startsAt, copy) })
          : t('bounty.status.summary.poster.assigned', { name }),
      );
    case 'en_route':
      return status(
        row.etaAt
          ? t('bounty.live.poster.enRoute', { name, time: clock(row.etaAt, copy) })
          : t('bounty.status.summary.poster.enRoute', { name }),
      );
    case 'done':
      return status(t('bounty.live.poster.done', { name }));
    case 'disputed':
      return status(t('bounty.live.poster.disputed', { name }));
    default:
      return null;
  }
}

function helperLine(row: LiveRow, name: string, copy: LiveCopy): Line | null {
  const { t } = copy;
  const status = (line: string): Line => ({ line, target: 'status' });
  switch (row.status) {
    case 'assigned':
      if (row.startLate) return status(t('bounty.live.helper.late'));
      return status(
        row.startsAt
          ? t('bounty.live.helper.assigned', { name, time: clock(row.startsAt, copy) })
          : t('bounty.status.step.helper.selected', { name }),
      );
    case 'en_route':
      return status(t('bounty.live.helper.enRoute'));
    case 'done':
      return status(
        row.autoConfirmAt
          ? t('bounty.live.helper.done', { name, date: when(row.autoConfirmAt, copy) })
          : t('bounty.status.summary.helper.done', { name }),
      );
    case 'disputed':
      return status(t('bounty.live.helper.disputed', { name }));
    default:
      return null;
  }
}

function applicantLine(row: LiveRow, name: string, { t }: LiveCopy): Line | null {
  const detail = (line: string): Line => ({ line, target: 'detail' });
  if (row.card === 'not_selected') return detail(t('bounty.live.applicant.notSelected'));
  if (row.status === 'open') return detail(t('bounty.live.applicant.waiting', { name }));
  return null;
}

const LINES = { poster: posterLine, helper: helperLine, applicant: applicantLine };

const TARGETS: Record<Line['target'], (id: string) => string> = {
  applicants: (id) => `/bounty/applicants/${id}`,
  status: (id) => `/bounty/status/${id}`,
  detail: (id) => `/bounty/${id}`,
};

function waitsOnOther(row: LiveRow) {
  if (row.kind === 'oneTime' || row.role === 'applicant') return true;
  if (row.role === 'poster') return row.status === 'open' || row.status === 'disputed';
  return row.status === 'done';
}

export function liveBountyItem(row: LiveRow, copy: LiveCopy): BountyLiveItem | null {
  const name = row.counterpartName ?? copy.t('bounty.post.unknownName');
  const found = LINES[row.role](row, name, copy);
  if (!found) return null;
  const card = row.kind === 'oneTime' ? (row.card ?? undefined) : undefined;
  const actionLabel =
    row.kind === 'bountyAction' && row.action ? copy.t(ACTION_LABEL[row.action]) : undefined;
  const kind: BountyCardKind = actionLabel
    ? 'bountyAction'
    : waitsOnOther(row)
      ? 'waitingConfirm'
      : 'bountyInProgress';
  const bounty: BountyCardDetail = {
    kind,
    role: row.role,
    bountyId: row.bountyId,
    title: row.title,
    category: row.category,
    rewardSen: row.rewardSen,
    counterpart: row.counterpartName,
    line: sentence(found.line),
    target: TARGETS[found.target](row.bountyId),
    ...(actionLabel ? { actionLabel } : {}),
    ...(card ? { oneTime: card, markSeen: () => copy.markSeen(row.bountyId, card) } : {}),
  };
  return { id: row.bountyId, kind, title: row.title, sub: bounty.line, bounty };
}

export function liveBountyItems(rows: readonly LiveRow[], copy: LiveCopy) {
  return rows.flatMap((row) => liveBountyItem(row, copy) ?? []);
}
