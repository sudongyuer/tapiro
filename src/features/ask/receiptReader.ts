import {
  parseReceiptReply,
  type ReceiptReadFailure,
  type ReceiptReadOutcome,
} from '@/lib/drafts/receiptDraft';
import type { CurrencyCode } from '@/lib/money';

import { hungryOffer, type Belly } from './belly';
import type { CloudCall, CloudImage, CloudResult } from './cloudGate';
import { askConsent, type ConsentGate } from './consentFlow';

export type ReceiptConsent = ConsentGate & {
  getSnapshot(): { userId: string | null };
  start(userId: string): void;
  reread(): Promise<{ belly?: Belly | null } | null>;
};

function failureOf(result: CloudResult): ReceiptReadFailure | null {
  if (result.kind === 'needsUpdate') return 'needsUpdate';
  if (result.kind === 'unavailable') return 'offline';
  if (result.kind !== 'failed') return null;
  if (result.error === 'hungry' || result.error === 'busy') return result.error;
  return result.status === null ? 'offline' : 'providerError';
}

const failed = (reason: ReceiptReadFailure): ReceiptReadOutcome => ({ kind: 'failed', reason });

export function createReceiptReader(deps: {
  call: CloudCall;
  consent: ReceiptConsent;
  encode: (uri: string) => Promise<CloudImage | null>;
}) {
  return async function read(
    userId: string,
    uri: string,
    currency: CurrencyCode,
    openConsent: () => void,
  ): Promise<ReceiptReadOutcome> {
    if (deps.consent.getSnapshot().userId !== userId) deps.consent.start(userId);
    const consented = async () => {
      const access = await askConsent(deps.consent, openConsent);
      if (access === 'given') return null;
      return access === 'notGiven'
        ? ({ kind: 'declined' } as const)
        : failed(access === 'offline' ? 'offline' : 'needsUpdate');
    };
    const refused = await consented();
    if (refused) return refused;
    const image = await deps.encode(uri).catch(() => null);
    if (!image) return failed('image');
    const request = { task: 'read_receipt' as const, input: { text: '', image } };
    let result = await deps.call(request);
    if (result.kind === 'consentRequired') {
      const again = await consented();
      if (again) return again;
      result = await deps.call(request);
    }
    if (result.kind === 'consentRequired') return { kind: 'declined' };
    const failure = failureOf(result);
    if (failure === 'hungry') {
      const status = await deps.consent.reread().catch(() => null);
      return failed(status?.belly && hungryOffer(status.belly) === 'capped' ? 'capped' : 'hungry');
    }
    if (failure) return failed(failure);
    const reading = result.kind === 'answered' ? parseReceiptReply(result.body, currency) : null;
    return reading ?? failed('providerError');
  };
}

export type ReadReceipt = ReturnType<typeof createReceiptReader>;
