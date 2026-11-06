export const REPORT_REASONS = [
  'harassment',
  'off_platform_payment',
  'inappropriate',
  'other',
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export const REPORT_NOTE_MAX = 500;

export type ReportPhase = 'form' | 'sending' | 'failed' | 'sent';

export const noteCount = (note: string) => [...note.trim()].length;

export const noteFits = (note: string) => noteCount(note) <= REPORT_NOTE_MAX;

export const canSubmit = (reason: ReportReason | null, note: string, phase: ReportPhase) =>
  reason !== null && noteFits(note) && (phase === 'form' || phase === 'failed');

export function cleanNote(note: string) {
  const trimmed = note.trim();
  return trimmed.length > 0 ? trimmed : null;
}
