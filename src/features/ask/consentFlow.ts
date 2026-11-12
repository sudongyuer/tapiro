import type { AskOutcome, PrepareResult } from './consentStore';

export type ConsentGate = {
  prepare(): Promise<PrepareResult>;
  ask(): { outcome: Promise<AskOutcome> };
};

export async function askConsent(
  consent: ConsentGate,
  openConsent: () => void,
): Promise<PrepareResult> {
  const access = await consent.prepare();
  if (access !== 'notGiven') return access;
  const asked = consent.ask();
  openConsent();
  const outcome = await asked.outcome;
  return outcome === 'declined' ? 'notGiven' : outcome;
}
