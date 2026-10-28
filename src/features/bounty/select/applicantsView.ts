import type { BountyDetail } from '../board/types';
import type { ApplicantsSnapshot } from './applicantsController';
import type { SendFailure } from './selectState';
import type { Applicant } from './types';

export type ApplicantsBody = 'gone' | 'closed' | 'done' | 'loading' | 'failed' | 'empty' | 'list';

export type FooterView =
  | { state: 'disabled' | 'busy'; others: number }
  | { state: 'ready'; applicant: Applicant; others: number };

export type NoticeReason = Exclude<SendFailure, 'gone' | 'closed'>;

export type ApplicantsView = {
  body: ApplicantsBody;
  applicants: Applicant[];
  stale: { loadedAt: string; refreshing: boolean } | null;
  footer: FooterView | null;
  notice: NoticeReason | null;
};

export function closedForChoosing(detail: BountyDetail, now: Date) {
  if (detail.status === 'closed' || detail.status === 'cancelled') return true;
  return detail.status === 'open' && new Date(detail.expiresAt).getTime() <= now.getTime();
}

function body({ select, detail }: ApplicantsSnapshot, now: Date): ApplicantsBody {
  const { list } = select;
  if (list.kind === 'gone' || detail.kind === 'gone') return 'gone';
  if (select.send.kind === 'selected') return 'done';
  if (select.send.kind === 'failed' && select.send.reason === 'closed') return 'closed';
  if (detail.kind === 'ready' && closedForChoosing(detail.detail, now)) return 'closed';
  if (list.kind === 'loading') return 'loading';
  if (list.kind === 'failed') return 'failed';
  return list.applicants.length === 0 ? 'empty' : 'list';
}

function footer(applicants: Applicant[], snapshot: ApplicantsSnapshot): FooterView | null {
  const { send, chosen } = snapshot.select;
  const others = applicants.length - 1;
  if (send.kind === 'sending' || send.kind === 'raced') return { state: 'busy', others };
  if (send.kind !== 'idle' && send.kind !== 'failed') return null;
  const applicant = applicants.find((item) => item.id === chosen);
  return applicant ? { state: 'ready', applicant, others } : { state: 'disabled', others };
}

function notice({ send }: ApplicantsSnapshot['select']): NoticeReason | null {
  if (send.kind !== 'failed' || send.reason === 'gone' || send.reason === 'closed') return null;
  return send.reason;
}

export function applicantsView(snapshot: ApplicantsSnapshot, now: Date): ApplicantsView {
  const shown = body(snapshot, now);
  const { list } = snapshot.select;
  const applicants = list.kind === 'ready' ? list.applicants : [];
  return {
    body: shown,
    applicants: shown === 'list' ? applicants : [],
    stale:
      list.kind === 'ready' && list.refreshFailed && (shown === 'list' || shown === 'empty')
        ? { loadedAt: list.loadedAt, refreshing: list.refreshing }
        : null,
    footer: shown === 'list' ? footer(applicants, snapshot) : null,
    notice: shown === 'list' || shown === 'empty' ? notice(snapshot.select) : null,
  };
}
