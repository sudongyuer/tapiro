import type { Person, Tier } from '../board/types';

export const APPLICANT_STATUSES = ['pending', 'selected'] as const;
export type ApplicantStatus = (typeof APPLICANT_STATUSES)[number];

export type Applicant = {
  id: string;
  name: string | null;
  tier: Tier;
  note: string | null;
  status: ApplicantStatus;
  appliedAt: string;
  helpedCount: number;
};

export type SelectFailure = 'taken' | 'closed' | 'notPending' | 'noPayee' | 'gone' | 'failed';

export type SelectOutcome = { ok: true; helperId: string } | { ok: false; reason: SelectFailure };

export type SelectService = {
  applicants(bountyId: string): Promise<Applicant[] | 'gone'>;
  select(bountyId: string, applicantId: string): Promise<SelectOutcome>;
  markNotSelectedSeen(bountyId: string): Promise<void>;
};

export const applicantPerson = (applicant: Applicant): Person => ({
  id: applicant.id,
  name: applicant.name,
  tier: applicant.tier,
});
