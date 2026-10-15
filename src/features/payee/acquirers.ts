export type Acquirer = { id: string; name: string; kind: 'bank' | 'wallet' };

export const ACQUIRERS: readonly Acquirer[] = [
  { id: '588734', name: 'Maybank', kind: 'bank' },
  { id: '501854', name: 'CIMB', kind: 'bank' },
  { id: '564162', name: 'Public Bank', kind: 'bank' },
  { id: '564160', name: 'RHB', kind: 'bank' },
  { id: '588830', name: 'Hong Leong Bank', kind: 'bank' },
  { id: '890053', name: 'TNG', kind: 'wallet' },
  { id: '890061', name: 'Boost', kind: 'wallet' },
  { id: '890046', name: 'GrabPay', kind: 'wallet' },
  { id: '890004', name: 'ShopeePay', kind: 'wallet' },
];

export const BANKS = ACQUIRERS.filter((acquirer) => acquirer.kind === 'bank');

export const TNG_ACQUIRER = '890053';
export const OTHER_BANK = 'other';

export function acquirerName(id: string | null | undefined) {
  return ACQUIRERS.find((acquirer) => acquirer.id === id)?.name ?? null;
}
