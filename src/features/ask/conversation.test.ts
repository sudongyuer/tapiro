import { describe, expect, test } from 'bun:test';

import type { AskReply } from './askReply';
import {
  CONVERSATION_KEEP_MS,
  keptConversation,
  REQUEST_TEXT_MAX,
  requestText,
  resumeLine,
  storedForm,
  type Turn,
  type UserTurn,
} from './conversation';

const typed = (text: string): UserTurn => ({ role: 'user', text, via: 'typed' });
const choice = (text: string): UserTurn => ({ role: 'user', text, via: 'choice' });
const tapir = (reply: AskReply, result: unknown = {}): Turn => ({
  role: 'tapir',
  raw: { tool: reply.kind === 'draft' ? 'draft_bounty' : reply.kind, result },
  reply,
});
const ASKED = tapir({ kind: 'clarify', question: '什么时候要？', choices: ['今晚'] });
const ANSWERED = tapir({ kind: 'answer', text: '好' });

describe('requestText', () => {
  test('a first message goes alone', () => {
    expect(requestText([], typed('帮我取快递'))).toBe('帮我取快递');
  });

  test('an answer to a question goes with the words that led to it', () => {
    const turns = [typed('取快递'), ASKED];
    expect(requestText(turns, choice('今晚'))).toBe('取快递\n什么时候要？ 今晚');
  });

  test('a closed exchange is not sent again', () => {
    const turns = [typed('靠谱度怎么涨？'), ANSWERED];
    expect(requestText(turns, typed('帮我取快递'))).toBe('帮我取快递');
  });

  test('two questions in a row keep the whole exchange', () => {
    const second = tapir({ kind: 'clarify', question: '送到哪？', choices: ['YC'] });
    const turns = [typed('取快递'), ASKED, choice('今晚'), second];
    expect(requestText(turns, choice('YC'))).toBe('取快递\n什么时候要？ 今晚\n送到哪？ YC');
  });

  test('an image with no words sends no line for it', () => {
    expect(requestText([], { role: 'user', text: '', via: 'image' })).toBe('');
  });

  test('a long exchange keeps its newest words within the limit', () => {
    const long = '字'.repeat(REQUEST_TEXT_MAX);
    const text = requestText([typed(long), ASKED], choice('今晚'));
    expect([...text]).toHaveLength(REQUEST_TEXT_MAX);
    expect(text.endsWith('什么时候要？ 今晚')).toBe(true);
  });
});

describe('a kept conversation', () => {
  const NOW = new Date('2026-11-12T10:00:00.000Z');
  const RAW_ANSWER = { tool: 'answer', result: { text: '好' } };
  const stored = (
    updatedAt: string,
    turns: unknown[] = [typed('取快递'), { role: 'tapir', raw: RAW_ANSWER }],
  ) => ({
    updatedAt,
    turns,
  });

  test('comes back for 7 days, then is gone', () => {
    const edge = new Date(NOW.getTime() - CONVERSATION_KEEP_MS).toISOString();
    expect(keptConversation(stored(edge), NOW)?.turns).toHaveLength(2);
    const old = new Date(NOW.getTime() - CONVERSATION_KEEP_MS - 1).toISOString();
    expect(keptConversation(stored(old), NOW)).toBeNull();
  });

  test('a turn the app cannot read drops the whole conversation', () => {
    const broken = stored(NOW.toISOString(), [typed('x'), { role: 'tapir', raw: { tool: 'x' } }]);
    expect(keptConversation(broken, NOW)).toBeNull();
    expect(keptConversation('junk', NOW)).toBeNull();
    expect(keptConversation(stored(NOW.toISOString(), []), NOW)).toBeNull();
  });

  test('round-trips through its stored form, and the line names the first words', () => {
    const conversation = keptConversation(stored(NOW.toISOString()), NOW)!;
    const back = keptConversation(JSON.parse(JSON.stringify(storedForm(conversation))), NOW);
    expect(back).toEqual(conversation);
    expect(resumeLine(back)).toBe('取快递');
    expect(resumeLine(null)).toBeNull();
  });
});
