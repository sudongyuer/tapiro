import type { BountyDetail } from '../board/types';
import type { ApplicantsSnapshot } from './applicantsController';
import type { Applicant } from './types';

export type ApplicantsBody = 'gone' | 'closed' | 'loading' | 'failed' | 'empty' | 'list';

export type FooterView =
  | { state: 'disabled'; others: number }
  | { state: 'ready' | 'busy'; applicant: Applicant; others: number };

export type ApplicantsView = {
  body: ApplicantsBody;
  applicants: Applicant[];
  stale: { loadedAt: string; refreshing: boolean } | null;
  footer: FooterView | null;
};

export function closedForChoosing(detail: BountyDetail, now: Date) {
  if (detail.status === 'closed' || detail.status === 'cancelled') return true;
  return detail.status === 'open' && new Date(detail.expiresAt).getTime() <= now.getTime();
}

function body({ select, detail }: ApplicantsSnapshot, now: Date): ApplicantsBody {
  const { list } = select;
  if (list.kind === 'gone' || detail.kind === 'gone') return 'gone';
  if (
    detail.kind === 'ready' &&
    select.send.kind !== 'selected' &&
    closedForChoosing(detail.detail, now)
  ) {
    return 'closed';
  }
  if (list.kind === 'loading') return 'loading';
  if (list.kind === 'failed') return 'failed';
  return list.applicants.length === 0 ? 'empty' : 'list';
}

function footer(applicants: Applicant[], snapshot: ApplicantsSnapshot): FooterView | null {
  const { send, chosen } = snapshot.select;
  const others = applicants.length - 1;
  const find = (id: string) => applicants.find((applicant) => applicant.id === id);
  if (send.kind === 'sending') {
    const applicant = find(send.applicantId);
    return applicant ? { state: 'busy', applicant, others } : null;
  }
  if (send.kind !== 'idle' && send.kind !== 'failed') return null;
  const applicant = chosen === null ? undefined : find(chosen);
  return applicant ? { state: 'ready', applicant, others } : { state: 'disabled', others };
}

export function applicantsView(snapshot: ApplicantsSnapshot, now: Date): ApplicantsView {
  const shown = body(snapshot, now);
  const { list } = snapshot.select;
  const applicants = list.kind === 'ready' ? list.applicants : [];
  return {
    body: shown,
    applicants: shown === 'list' ? applicants : [],
    stale:
      list.kind === 'ready' && list.refreshFailed && shown !== 'gone' && shown !== 'closed'
        ? { loadedAt: list.loadedAt, refreshing: list.refreshing }
        : null,
    footer: shown === 'list' ? footer(applicants, snapshot) : null,
  };
}
