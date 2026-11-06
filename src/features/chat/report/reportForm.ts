import { cleanNote, type ReportReason } from '@/lib/report';

import type { ReportInput } from '../types';

export { canSubmit, noteCount, noteFits, type ReportPhase } from '@/lib/report';

export function reportInput(
  target: { userId: string; messageId: string | null },
  reason: ReportReason,
  note: string,
): ReportInput {
  return { ...target, reason, note: cleanNote(note) };
}
