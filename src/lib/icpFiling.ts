import Constants from 'expo-constants';

import { uiVerifyArgument } from './uiVerify';

export function icpFilingFrom(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

export const icpFiling = icpFilingFrom(
  uiVerifyArgument('uiVerifyIcpFiling') ?? Constants.expoConfig?.extra?.icpFiling,
);
