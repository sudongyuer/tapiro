import { body, count, fail, oneOf, text, textOrNull } from '../board/parse';
import { TIERS } from '../board/types';
import { APPLICANT_STATUSES, type Applicant } from './types';

export function toApplicant(value: unknown): Applicant {
  const row = body(value, 'applicant');
  return {
    id: text(row.applicantId, 'applicantId'),
    name: textOrNull(row.name, 'name'),
    tier: oneOf(TIERS, row.tier, 'tier'),
    note: textOrNull(row.note, 'note'),
    status: oneOf(APPLICANT_STATUSES, row.status, 'status'),
    appliedAt: text(row.appliedAt, 'appliedAt'),
    helpedCount: count(row.helpedCount, 'helpedCount'),
  };
}

export const toApplicants = (value: unknown): Applicant[] =>
  Array.isArray(value) ? value.map(toApplicant) : fail('applicants');
