import { describe, expect, test } from 'bun:test';

import { parseAskReply, toRawReply } from './askReply';
import { createFixtureSender, FIXTURE_REPLIES, fixtureReplies } from './fixtureAskReplies';

const NOW = new Date('2026-11-12T04:00:00.000Z');

describe('verify replies', () => {
  test('every reply the app can read parses, and malformed does not', async () => {
    for (const reply of FIXTURE_REPLIES) {
      const send = createFixtureSender({
        replies: [reply],
        delayMs: 0,
        now: () => NOW,
        onCall: () => {},
        onConsentRequired: () => {},
      });
      const answer = await send({ task: 'ask', input: { text: 'x' } });
      if (!answer.ok) continue;
      const raw = toRawReply(answer.body);
      expect(raw !== null && parseAskReply(raw) !== null).toBe(
        reply !== 'malformed' && reply !== 'silence',
      );
    }
  });

  test('a recording comes back written down in its language, or empty for silence', async () => {
    const calls: unknown[] = [];
    const send = createFixtureSender({
      replies: fixtureReplies('answer,silence'),
      delayMs: 0,
      onCall: (name, args) => calls.push({ name, args }),
      onConsentRequired: () => {},
    });
    const audio = { mediaType: 'audio/mp4' as const, data: 'AAAAHGZ0eXBNNEEg' };
    const first = await send({ task: 'transcribe', input: { audio, language: 'ms' } });
    const second = await send({ task: 'transcribe', input: { audio, language: 'ms' } });
    expect(first.ok && (first.body as { result: unknown }).result).toEqual({
      text: 'Tolong ambil bungkusan saya di Pyramid esok',
    });
    expect(second.ok && (second.body as { result: unknown }).result).toEqual({ text: '' });
    expect(calls[0]).toEqual({ name: 'transcribe', args: { language: 'ms', audio: true } });
  });

  test('replies run in order and the last one repeats', async () => {
    const calls: unknown[] = [];
    const send = createFixtureSender({
      replies: fixtureReplies('clarify,answer,nonsense'),
      delayMs: 0,
      onCall: (_name, args) => calls.push(args),
      onConsentRequired: () => {},
    });
    const tools = [];
    for (let i = 0; i < 3; i += 1) {
      const answer = await send({ task: 'ask', input: { text: `t${i}` } });
      tools.push(answer.ok ? (answer.body as { tool: string }).tool : null);
    }
    expect(tools).toEqual(['clarify', 'answer', 'answer']);
    expect(calls).toEqual([
      { text: 't0', image: false },
      { text: 't1', image: false },
      { text: 't2', image: false },
    ]);
    expect(fixtureReplies(undefined)).toEqual(['answer']);
  });
});
