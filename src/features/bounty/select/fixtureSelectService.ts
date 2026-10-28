import type { Person, Tier } from '../board/types';
import { applicantPerson, type Applicant, type SelectOutcome, type SelectService } from './types';

export const APPLICANT_SETS = ['three', 'none', 'one', 'fifty', 'worst'] as const;
export const APPLICANTS_FAILURES = ['none', 'first', 'refresh'] as const;
export const SELECT_MODES = [
  'ok',
  'failOnce',
  'lostAnswer',
  'taken',
  'notPending',
  'noPayee',
  'closed',
] as const;

export type ApplicantSet = (typeof APPLICANT_SETS)[number];
export type ApplicantsFailure = (typeof APPLICANTS_FAILURES)[number];
export type SelectMode = (typeof SELECT_MODES)[number];

export type SelectedArgs = { bounty: string; applicant: string };

export type FixtureSelectOptions = {
  applicants: ApplicantSet;
  fail: ApplicantsFailure;
  select: SelectMode;
  now: () => Date;
  writeDelayMs?: number;
  isBlocked?: (applicantId: string) => boolean;
  onSelected?: (accepted: SelectedArgs[]) => void;
  onAttempted?: (attempts: number) => void;
};

const MINUTE_MS = 60_000;

const pick = <T extends string>(values: readonly T[], value: string | undefined, fallback: T): T =>
  values.find((candidate) => candidate === value) ?? fallback;

export function fixtureSelectOptions(
  argument: (name: string) => string | undefined,
  now: () => Date = () => new Date(),
): FixtureSelectOptions {
  return {
    applicants: pick(APPLICANT_SETS, argument('uiVerifyApplicants'), 'three'),
    fail: pick(APPLICANTS_FAILURES, argument('uiVerifyApplicantsFail'), 'none'),
    select: pick(SELECT_MODES, argument('uiVerifySelect'), 'ok'),
    now,
  };
}

type Seed = Omit<Applicant, 'status' | 'appliedAt'>;

const seed = (
  id: string,
  name: string,
  tier: Tier,
  helpedCount: number,
  note: string | null = null,
): Seed => ({ id, name, tier, helpedCount, note });

const JIE = seed(
  'fixture-applicant-jie',
  '阿杰',
  'very_reliable',
  14,
  '我就在 Sunway Geo 楼下，十分钟内可以到，拿到后直接送上楼。',
);
const HANA = seed('fixture-applicant-hana', 'Hana', 'new_friend', 0);
const AIMAN = seed('fixture-applicant-aiman', 'Aiman', 'reliable', 3);

const exactly = (text: string, length: number) =>
  [...text.repeat(length)].slice(0, length).join('');

const WORST: Seed[] = [
  seed(
    'fixture-applicant-worst-latin',
    exactly('Muhammad Hafiz Haikal bin Mohd Yusof Ali ', 40),
    'tapir_friend',
    128,
    exactly(
      'Saya di lobi Sunway Geo Residences sekarang, boleh sampai dalam 10 minit dengan troli. ',
      140,
    ),
  ),
  seed(
    'fixture-applicant-worst-cjk',
    exactly('欧阳慕容司马诸葛上官', 40),
    'tapir_friend',
    128,
    exactly('我有推车可以帮你把三个行李箱搬上二十三楼到了先给你发消息', 140),
  ),
  seed(
    'fixture-applicant-worst-unbroken',
    exactly('Abcdefghijklmnopqrstuvwxyz', 40),
    'tapir_friend',
    128,
    exactly('Sunway🧋Pyramid', 140),
  ),
];

const FIFTY_NAMES = [
  'Wei Jie',
  'Mei Ling',
  'Hafiz',
  'Siti',
  '小雨',
  'Daniel',
  'Arif',
  '陈嘉欣',
  'Lily',
  'Jason',
];

const FIFTY: Seed[] = Array.from({ length: 50 }, (_, index) =>
  seed(
    `fixture-applicant-${String(index + 1).padStart(2, '0')}`,
    `${FIFTY_NAMES[index % FIFTY_NAMES.length]} ${index + 1}`,
    (['new_friend', 'reliable', 'very_reliable', 'tapir_friend'] as const)[index % 4],
    (index * 7) % 23,
    index % 3 === 0 ? `第 ${index + 1} 个申请：我下午都有空，可以顺路过去。` : null,
  ),
);

const SETS: Record<ApplicantSet, Seed[]> = {
  three: [JIE, HANA, AIMAN],
  none: [],
  one: [JIE],
  fifty: FIFTY,
  worst: WORST,
};

const pause = (ms: number) =>
  ms > 0 ? new Promise<void>((resolve) => setTimeout(resolve, ms)) : Promise.resolve();

type Posted = { pending: Applicant[]; helper: Applicant | null };

export function createFixtureSelectService(options: FixtureSelectOptions) {
  const base = options.now().getTime();
  const seeds = SETS[options.applicants];
  const posted = new Map<string, Posted>();
  const accepted: SelectedArgs[] = [];
  let loads = 0;
  let attempts = 0;
  let selectFailures = options.select === 'failOnce' ? 1 : 0;

  function bounty(id: string): Posted {
    const known = posted.get(id);
    if (known) return known;
    const fresh: Posted = {
      pending: seeds.map((item, index) => ({
        ...item,
        status: 'pending',
        appliedAt: new Date(base - (seeds.length - index) * MINUTE_MS).toISOString(),
      })),
      helper: null,
    };
    posted.set(id, fresh);
    return fresh;
  }

  const hidden = (applicant: Applicant) => options.isBlocked?.(applicant.id) ?? false;

  function assign(state: Posted, applicant: Applicant) {
    state.helper = { ...applicant, status: 'selected' };
    state.pending = [];
  }

  const service: SelectService = {
    async applicants(bountyId) {
      const state = bounty(bountyId);
      loads += 1;
      if (
        (options.fail === 'first' && loads === 1) ||
        (options.fail === 'refresh' && loads === 2)
      ) {
        throw new TypeError('Network request failed');
      }
      const listed = state.helper ? [state.helper] : state.pending;
      return listed.filter((applicant) => !hidden(applicant)).map((item) => ({ ...item }));
    },
    async select(bountyId, applicantId): Promise<SelectOutcome> {
      attempts += 1;
      options.onAttempted?.(attempts);
      await pause(options.writeDelayMs ?? 0);
      if (selectFailures > 0) {
        selectFailures -= 1;
        return { ok: false, reason: 'failed' };
      }
      const state = bounty(bountyId);
      if (!state.helper && options.select === 'taken' && state.pending[0]) {
        assign(state, state.pending[0]);
      }
      if (state.helper) {
        if (state.helper.id !== applicantId) return { ok: false, reason: 'taken' };
      } else {
        if (options.select === 'closed') return { ok: false, reason: 'closed' };
        const applicant = state.pending.find((item) => item.id === applicantId);
        if (!applicant || hidden(applicant)) return { ok: false, reason: 'notPending' };
        if (options.select === 'notPending') {
          state.pending = state.pending.filter((item) => item.id !== applicantId);
          return { ok: false, reason: 'notPending' };
        }
        if (options.select === 'noPayee') return { ok: false, reason: 'noPayee' };
        assign(state, applicant);
      }
      const first = accepted.length === 0;
      accepted.push({ bounty: bountyId, applicant: applicantId });
      options.onSelected?.([...accepted]);
      if (options.select === 'lostAnswer' && first) return { ok: false, reason: 'failed' };
      return { ok: true, helperId: applicantId };
    },
    async markNotSelectedSeen() {},
  };

  return {
    service,
    posterView(bountyId: string): { helper: Person | null } | null {
      const state = posted.get(bountyId);
      if (!state) return null;
      return { helper: state.helper ? applicantPerson(state.helper) : null };
    },
  };
}
