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
      expect(raw === null ? null : parseAskReply(raw) !== null).toBe(reply !== 'malformed');
    }
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
