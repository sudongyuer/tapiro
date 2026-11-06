import type { TFunction } from 'i18next';

import type { Person } from '../types';

export const SAMPLE_CODE = '7KQ3XP';

export const spelled = (code: string) => code.split('').join(' ');

export const personLabel = (person: Person | null, t: TFunction) =>
  person?.name?.trim() || t('coins.invite.someone');

export const shareText = (code: string, reward: number, t: TFunction) =>
  t('coins.invite.shareText', { code, reward });
