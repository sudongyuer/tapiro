import type { PermissionState } from './types';

export type PermissionResponseLike = {
  status: string;
  granted: boolean;
  canAskAgain: boolean;
  ios?: { accuracy: 'full' | 'reduced' };
};

export function mapPermission(response: PermissionResponseLike): PermissionState {
  if (response.granted || response.status === 'granted')
    return { status: 'granted', reduced: response.ios?.accuracy === 'reduced' };
  if (response.status === 'denied' || !response.canAskAgain)
    return { status: 'denied', reduced: false };
  return { status: 'undetermined', reduced: false };
}
