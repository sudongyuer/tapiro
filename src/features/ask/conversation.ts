import { parseAskReply, type AskReply, type RawReply } from './askReply';

export const CONVERSATION_KEEP_MS = 7 * 24 * 3_600_000;
export const REQUEST_TEXT_MAX = 2000;

export type UserTurn = { role: 'user'; text: string; via: 'typed' | 'choice' | 'image' };
export type TapirTurn = { role: 'tapir'; raw: RawReply; reply: AskReply };
export type Turn = UserTurn | TapirTurn;

export type Conversation = { turns: Turn[]; updatedAt: string };

const opensExchange = (turn: Turn) => turn.role === 'tapir' && turn.reply.kind === 'clarify';

function openExchange(turns: Turn[]) {
  let start = turns.length;
  while (start > 0) {
    const turn = turns[start - 1];
    if (turn.role === 'tapir' && !opensExchange(turn)) break;
    start -= 1;
  }
  return turns.slice(start);
}

function tail(text: string, max: number) {
  const points = [...text];
  return points.length <= max ? text : points.slice(points.length - max).join('');
}

// The server takes text only, so an answer to 小貘's question goes back with the words that led to it. A reply that is
// not a question closes the exchange: what came before it is not sent again.
export function requestText(turns: Turn[], next: UserTurn) {
  const lines: string[] = [];
  let asked: string | null = null;
  for (const turn of [...openExchange(turns), next]) {
    if (turn.role === 'tapir') {
      asked = turn.reply.kind === 'clarify' ? turn.reply.question : null;
      continue;
    }
    if (turn.text === '') continue;
    lines.push(turn.via === 'choice' && asked ? `${asked} ${turn.text}` : turn.text);
    asked = null;
  }
  return tail(lines.join('\n'), REQUEST_TEXT_MAX);
}

export function resumeLine(conversation: Conversation | null) {
  const first = conversation?.turns.find(
    (turn): turn is UserTurn => turn.role === 'user' && turn.text !== '',
  );
  return first?.text ?? null;
}

export function keptConversation(value: unknown, now: Date): Conversation | null {
  if (typeof value !== 'object' || value === null) return null;
  const { turns, updatedAt } = value as Record<string, unknown>;
  if (typeof updatedAt !== 'string' || !Array.isArray(turns)) return null;
  const at = Date.parse(updatedAt);
  if (Number.isNaN(at) || now.getTime() - at > CONVERSATION_KEEP_MS) return null;
  const parsed: Turn[] = [];
  for (const turn of turns as Record<string, unknown>[]) {
    const next = parseTurn(turn);
    if (!next) return null;
    parsed.push(next);
  }
  return parsed.length > 0 ? { turns: parsed, updatedAt } : null;
}

function parseTurn(turn: Record<string, unknown> | null): Turn | null {
  if (typeof turn !== 'object' || turn === null) return null;
  if (turn.role === 'user') {
    const via = turn.via;
    if (typeof turn.text !== 'string') return null;
    if (via !== 'typed' && via !== 'choice' && via !== 'image') return null;
    return { role: 'user', text: turn.text, via };
  }
  if (turn.role !== 'tapir' || typeof turn.raw !== 'object' || turn.raw === null) return null;
  const raw = turn.raw as RawReply;
  const reply = parseAskReply(raw);
  return reply ? { role: 'tapir', raw, reply } : null;
}

export const storedTurn = (turn: Turn) =>
  turn.role === 'user' ? turn : { role: 'tapir', raw: turn.raw };

export function storedForm(conversation: Conversation) {
  return { updatedAt: conversation.updatedAt, turns: conversation.turns.map(storedTurn) };
}
