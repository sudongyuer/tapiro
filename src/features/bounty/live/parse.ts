import { bountyCategory } from '@/lib/stickers/category';
import { artOrNull } from '@/lib/stickers/parse';

import { body, count, fail, oneOf, reward, text, textOrNull } from '../board/parse';
import { BOUNTY_STATUSES, POST_CHARGES } from '../status/types';
import { LIVE_ACTIONS, LIVE_KINDS, LIVE_ROLES, SEEN_CARDS, type LiveRow } from './types';

const absent = (value: unknown) => value === null || value === undefined;

const oneOfOrNull = <T extends string>(values: readonly T[], value: unknown, what: string) =>
  absent(value) ? null : oneOf(values, value, what);

const countOrNull = (value: unknown, what: string) => (absent(value) ? null : count(value, what));

export function toLiveRow(value: unknown): LiveRow {
  const row = body(value, 'live row');
  return {
    bountyId: text(row.bountyId, 'bountyId'),
    title: text(row.title, 'title'),
    category: bountyCategory(row.category) ?? fail('category'),
    art: artOrNull(row.art),
    reward: reward(row),
    role: oneOf(LIVE_ROLES, row.role, 'role'),
    kind: oneOf(LIVE_KINDS, row.kind, 'kind'),
    action: oneOfOrNull(LIVE_ACTIONS, row.action, 'action'),
    card: oneOfOrNull(SEEN_CARDS, row.card, 'card'),
    status: oneOf(BOUNTY_STATUSES, row.status, 'status'),
    counterpartName: textOrNull(row.counterpartName, 'counterpartName'),
    applicantCount: countOrNull(row.applicantCount, 'applicantCount'),
    startsAt: textOrNull(row.startsAt, 'startsAt'),
    startLate: row.startLate === true,
    etaAt: textOrNull(row.etaAt, 'etaAt'),
    previousEtaAt: textOrNull(row.previousEtaAt, 'previousEtaAt'),
    autoConfirmAt: textOrNull(row.autoConfirmAt, 'autoConfirmAt'),
    issueReason: textOrNull(row.issueReason, 'issueReason'),
    refund: oneOfOrNull(POST_CHARGES, row.refund, 'refund'),
  };
}

export function toLiveRows(value: unknown): LiveRow[] {
  return Array.isArray(value) ? value.map(toLiveRow) : fail('live rows');
}
