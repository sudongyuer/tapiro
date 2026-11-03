import type { NoticePermission } from './types';

const IOS_STATUS = { denied: 1, authorized: 2, provisional: 3, ephemeral: 4 } as const;

export type PermissionReading = { granted: boolean; ios?: { status: number } | null };

// expo-notifications reports provisional authorisation as `undetermined` at the top level (AGENTS.md).
export function toPermission(reading: PermissionReading): NoticePermission {
  const status = reading.ios?.status;
  if (status === IOS_STATUS.provisional || status === IOS_STATUS.ephemeral) return 'provisional';
  if (status === IOS_STATUS.authorized || reading.granted) return 'allowed';
  if (status === IOS_STATUS.denied) return 'denied';
  return 'undetermined';
}

export const canSchedule = (permission: NoticePermission) =>
  permission === 'allowed' || permission === 'provisional';

export const shouldAskInContext = (permission: NoticePermission, asked: boolean) =>
  !asked && (permission === 'undetermined' || permission === 'provisional');
