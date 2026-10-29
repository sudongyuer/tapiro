import type { BountyDetail } from '../board/types';

export type AddressLoad =
  | { kind: 'loading' }
  | { kind: 'failed' }
  | { kind: 'gone' }
  | { kind: 'ready'; detail: Pick<BountyDetail, 'address'> };

export type AddressView =
  { kind: 'loading' } | { kind: 'failed' } | { kind: 'none' } | { kind: 'shown'; address: string };

export function addressView(load: AddressLoad): AddressView {
  if (load.kind === 'loading') return { kind: 'loading' };
  if (load.kind !== 'ready') return { kind: 'failed' };
  const { address } = load.detail;
  return address ? { kind: 'shown', address } : { kind: 'none' };
}
