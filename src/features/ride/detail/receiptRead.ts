import type { ReceiptReadFailure, ReceiptReadOutcome } from '@/lib/drafts/receiptDraft';
import type { DecimalSeparator, Money } from '@/lib/money';

import { shareText, type ReceiptDraft, type SplitDraft } from './splitDraft';

export type ReceiptRead =
  | { status: 'idle' }
  | { status: 'reading'; uri: string }
  | { status: 'done'; uri: string; outcome: ReceiptReadOutcome; filled: string | null };

export type ReadNote =
  | { kind: 'offer' }
  | { kind: 'filled' | 'kept' | 'otherCurrency'; amount: Money }
  | { kind: 'unreadable' }
  | { kind: 'failed'; reason: ReceiptReadFailure };

export const IDLE_READ: ReceiptRead = { status: 'idle' };

export function receiptUri(receipt: ReceiptDraft): string | null {
  return 'uri' in receipt ? receipt.uri : null;
}

// 小貘 fills the total only while it still holds what it held at the tap and the same receipt is attached; a total the
// organiser typed meanwhile is theirs.
export function fillFromReading(
  tapped: SplitDraft,
  latest: SplitDraft | null,
  uri: string,
  outcome: ReceiptReadOutcome,
  decimal: DecimalSeparator,
): { draft: SplitDraft | null; read: ReceiptRead } {
  const same =
    latest !== null &&
    receiptUri(latest.receipt) === uri &&
    latest.totalText.trim() === tapped.totalText.trim();
  if (outcome.kind !== 'read' || !same) {
    return { draft: null, read: { status: 'done', uri, outcome, filled: null } };
  }
  const text = shareText(outcome.total, decimal);
  return {
    draft: { ...latest, totalText: text },
    read: { status: 'done', uri, outcome, filled: text },
  };
}

export function readNote(read: ReceiptRead, draft: SplitDraft): ReadNote | null {
  const uri = receiptUri(draft.receipt);
  if (uri === null) return null;
  if (read.status !== 'done' || read.uri !== uri) return { kind: 'offer' };
  const { outcome } = read;
  switch (outcome.kind) {
    case 'read':
      return read.filled !== null && read.filled === draft.totalText.trim()
        ? { kind: 'filled', amount: outcome.total }
        : { kind: 'kept', amount: outcome.total };
    case 'otherCurrency':
      return { kind: 'otherCurrency', amount: outcome.total };
    case 'unreadable':
      return { kind: 'unreadable' };
    case 'failed':
      return { kind: 'failed', reason: outcome.reason };
    case 'declined':
      return { kind: 'offer' };
  }
}

export function canRead(read: ReceiptRead, draft: SplitDraft): boolean {
  const uri = receiptUri(draft.receipt);
  if (uri === null) return false;
  if (read.status === 'reading') return false;
  const note = readNote(read, draft);
  return note?.kind !== 'filled' && note?.kind !== 'kept';
}

export const isReading = (read: ReceiptRead, draft: SplitDraft) =>
  read.status === 'reading' && read.uri === receiptUri(draft.receipt);
