import type { SplitDraft } from './splitDraft';
import type { RideDetailService } from './types';

export type PreparedReceipt =
  | { ok: true; path: string | null; draft: SplitDraft }
  | { ok: false; reason: 'failed' | 'receiptExpired'; draft: SplitDraft };

export async function prepareReceipt(
  id: string,
  draft: SplitDraft,
  service: Pick<RideDetailService, 'uploadReceipt' | 'receiptExists'>,
): Promise<PreparedReceipt> {
  const { receipt } = draft;
  if (receipt.status === 'none' || receipt.status === 'expired') {
    return { ok: true, path: null, draft };
  }
  if (receipt.status === 'uploaded') {
    let exists: boolean;
    try {
      exists = await service.receiptExists(receipt.path);
    } catch {
      return { ok: false, reason: 'failed', draft };
    }
    return exists
      ? { ok: true, path: receipt.path, draft }
      : {
          ok: false,
          reason: 'receiptExpired',
          draft: { ...draft, receipt: { status: 'expired' } },
        };
  }
  try {
    const path = await service.uploadReceipt(id, receipt.uri);
    return {
      ok: true,
      path,
      draft: { ...draft, receipt: { status: 'uploaded', uri: receipt.uri, path } },
    };
  } catch {
    return {
      ok: false,
      reason: 'failed',
      draft: { ...draft, receipt: { status: 'failed', uri: receipt.uri } },
    };
  }
}
