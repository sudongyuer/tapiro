import type { TFunction } from 'i18next';

import type { SendFailure, StatusLine } from './selectState';

const FAILURE_KEYS = {
  failed: 'bounty.select.failure.failed',
  notPending: 'bounty.select.failure.notPending',
  noPayee: 'bounty.select.failure.noPayee',
  closed: 'bounty.select.failure.closed',
  gone: 'bounty.detail.gone',
} as const satisfies Record<SendFailure, string>;

export const selectFailureCopy = (reason: SendFailure, t: TFunction) => t(FAILURE_KEYS[reason]);

export const helpedLine = (helpedCount: number, t: TFunction) =>
  helpedCount === 0
    ? t('bounty.select.meta.neverHelped')
    : t('bounty.select.meta.helped', { count: helpedCount });

export const statusCopy = (line: StatusLine, t: TFunction) =>
  line.key === 'bounty.select.statusOpen' ? t(line.key, { count: line.count }) : t(line.key);

export const raceBody = (name: string | null, t: TFunction) =>
  name === null ? t('bounty.select.race.bodyNoName') : t('bounty.select.race.body', { name });
