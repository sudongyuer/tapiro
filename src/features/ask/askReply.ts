import { parseBountyDraft, type BountyDraft } from '@/lib/drafts/bountyDraft';

export const CLARIFY_CHOICES_MAX = 3;

export type PickItem = { summary: string; draft: BountyDraft; raw: unknown };

export type AskReply =
  | { kind: 'draft'; draft: BountyDraft }
  | { kind: 'answer'; text: string }
  | { kind: 'clarify'; question: string; choices: string[] }
  | { kind: 'pick'; items: PickItem[] };

export type RawReply = { tool: string; result: unknown };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const text = (value: unknown) =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : null;

function parsePickItem(value: unknown): PickItem | null {
  if (!isRecord(value)) return null;
  const summary = text(value.summary);
  const parsed = parseBountyDraft(value.draft);
  return summary && parsed.ok ? { summary, draft: parsed.draft, raw: value.draft } : null;
}

export function toRawReply(body: unknown): RawReply | null {
  if (!isRecord(body) || typeof body.tool !== 'string') return null;
  return { tool: body.tool, result: body.result };
}

export function parseAskReply(raw: RawReply): AskReply | null {
  const { tool, result } = raw;
  if (!isRecord(result)) return null;
  if (tool === 'draft_bounty') {
    const parsed = parseBountyDraft(result);
    return parsed.ok ? { kind: 'draft', draft: parsed.draft } : null;
  }
  if (tool === 'answer') {
    const answer = text(result.text);
    return answer ? { kind: 'answer', text: answer } : null;
  }
  if (tool === 'clarify') {
    const question = text(result.question);
    const choices = Array.isArray(result.choices) ? result.choices.map(text) : [];
    if (!question || choices.length === 0 || choices.length > CLARIFY_CHOICES_MAX) return null;
    if (choices.some((choice) => choice === null)) return null;
    return { kind: 'clarify', question, choices: choices as string[] };
  }
  if (tool === 'pick') {
    const items = Array.isArray(result.items) ? result.items.map(parsePickItem) : [];
    if (items.length < 2 || items.some((item) => item === null)) return null;
    return { kind: 'pick', items: items as PickItem[] };
  }
  return null;
}
