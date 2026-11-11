import { describe, expect, test } from 'bun:test';

import { parseAskReply, toRawReply } from './askReply';

const DRAFT = {
  title: '帮取快递',
  category: 'pickup',
  rewardMajor: 15,
  currency: 'MYR',
  description: null,
  deadlineAt: null,
  startsAt: null,
  endsAt: null,
  placeHint: null,
};

describe('parseAskReply', () => {
  test('each tool becomes its reply', () => {
    expect(parseAskReply({ tool: 'draft_bounty', result: DRAFT })?.kind).toBe('draft');
    expect(parseAskReply({ tool: 'answer', result: { text: ' 按近 180 天算 ' } })).toEqual({
      kind: 'answer',
      text: '按近 180 天算',
    });
    expect(
      parseAskReply({ tool: 'clarify', result: { question: '什么时候要？', choices: ['今晚'] } }),
    ).toEqual({ kind: 'clarify', question: '什么时候要？', choices: ['今晚'] });
    const pick = parseAskReply({
      tool: 'pick',
      result: {
        items: [
          { summary: 'a', draft: DRAFT },
          { summary: 'b', draft: DRAFT },
        ],
      },
    });
    expect(pick?.kind === 'pick' && pick.items.map((item) => item.raw)).toEqual([DRAFT, DRAFT]);
  });

  test.each([
    ['an unknown tool', { tool: 'publish', result: {} }],
    ['a draft the contract refuses', { tool: 'draft_bounty', result: { ...DRAFT, publish: true } }],
    ['a blank answer', { tool: 'answer', result: { text: ' ' } }],
    ['a question with no choices', { tool: 'clarify', result: { question: '?', choices: [] } }],
    [
      'a question with four choices',
      { tool: 'clarify', result: { question: '?', choices: ['a', 'b', 'c', 'd'] } },
    ],
    ['a blank choice', { tool: 'clarify', result: { question: '?', choices: [' '] } }],
    ['a pick of one', { tool: 'pick', result: { items: [{ summary: 'a', draft: DRAFT }] } }],
    [
      'a pick with a broken draft',
      {
        tool: 'pick',
        result: {
          items: [
            { summary: 'a', draft: DRAFT },
            { summary: 'b', draft: {} },
          ],
        },
      },
    ],
    ['no result', { tool: 'answer', result: null }],
  ])('%s is no reply', (_name, raw) => {
    expect(parseAskReply(raw)).toBeNull();
  });

  test('the raw reply needs a tool name', () => {
    expect(toRawReply({ task: 'ask', tool: 'answer', result: { text: 'x' } })).toEqual({
      tool: 'answer',
      result: { text: 'x' },
    });
    expect(toRawReply({ result: {} })).toBeNull();
    expect(toRawReply(null)).toBeNull();
  });
});
