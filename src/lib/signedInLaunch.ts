export type SignedInLaunch = { onboarded: boolean };

export function signedInLaunch(value: unknown): SignedInLaunch | undefined {
  if (value === undefined || value === null || value === '' || value === '0') return undefined;
  return { onboarded: String(value) === 'onboarded' };
}
