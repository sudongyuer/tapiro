import { useMemo } from 'react';

import type { ReceiptReader } from '@/lib/drafts/receiptDraft';

import { readReceipt } from './services';

export function useReceiptReader(userId: string | null): ReceiptReader | null {
  return useMemo(
    () =>
      userId === null
        ? null
        : { read: (uri, currency, openConsent) => readReceipt(userId, uri, currency, openConsent) },
    [userId],
  );
}
