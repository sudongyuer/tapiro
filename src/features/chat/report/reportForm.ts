import { REPORT_NOTE_MAX, type ReportInput, type ReportReason } from '../types';

export type ReportPhase = 'form' | 'sending' | 'failed' | 'sent';

export const noteCount = (note: string) => [...note.trim()].length;

export const noteFits = (note: string) => noteCount(note) <= REPORT_NOTE_MAX;

export const canSubmit = (reason: ReportReason | null, note: string, phase: ReportPhase) =>
  reason !== null && noteFits(note) && (phase === 'form' || phase === 'failed');

export function reportInput(
  target: { userId: string; messageId: string | null },
  reason: ReportReason,
  note: string,
): ReportInput {
  const trimmed = note.trim();
  return { ...target, reason, note: trimmed.length > 0 ? trimmed : null };
}
