// The version whose copy this build shows on the consent screen. record_consent refuses any other, so it must never
// come from ai_status(); bump it only together with the consent copy.
export const APP_CONSENT_VERSION = 1;

export type ConsentStatus = {
  currentVersion: number;
  given: boolean;
  acceptedAt: string | null;
};

export type CloudAccess = 'given' | 'notGiven' | 'needsUpdate';

export type WriteFailure = 'failed' | 'needsUpdate';

export type WriteResult =
  { ok: true; status: ConsentStatus } | { ok: false; failure: WriteFailure };

export type AskService = {
  status(): Promise<ConsentStatus>;
  recordConsent(version: number): Promise<WriteResult>;
  withdrawConsent(): Promise<WriteResult>;
};

export function cloudAccess(status: ConsentStatus, appVersion = APP_CONSENT_VERSION): CloudAccess {
  if (status.given) return 'given';
  return status.currentVersion === appVersion ? 'notGiven' : 'needsUpdate';
}

const fail = (what: string): never => {
  throw new Error(`ask: unexpected ${what}`);
};

export function toConsentStatus(value: unknown): ConsentStatus {
  const row =
    typeof value === 'object' && value !== null
      ? (value as Record<string, unknown>)
      : fail('status');
  const consent =
    typeof row.consent === 'object' && row.consent !== null
      ? (row.consent as Record<string, unknown>)
      : fail('consent');
  const { currentVersion, given, acceptedAt } = consent;
  if (!Number.isInteger(currentVersion) || Number(currentVersion) < 1) fail('currentVersion');
  if (typeof given !== 'boolean') fail('given');
  if (acceptedAt !== null && acceptedAt !== undefined) {
    if (typeof acceptedAt !== 'string' || Number.isNaN(Date.parse(acceptedAt))) fail('acceptedAt');
  }
  if (given && (acceptedAt === null || acceptedAt === undefined)) fail('acceptedAt');
  return {
    currentVersion: Number(currentVersion),
    given: given as boolean,
    acceptedAt: given ? (acceptedAt as string) : null,
  };
}

export function toWriteFailure(error: unknown): WriteFailure {
  const message = (error as { message?: unknown } | null)?.message;
  return message === 'stale_consent_version' ? 'needsUpdate' : 'failed';
}
