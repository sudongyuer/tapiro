import { describe, expect, test } from 'bun:test';

import {
  BOUNTY_DRAFT_FIELDS,
  BOUNTY_DRAFT_LIMITS,
  parseBountyDraft,
} from '../../../src/lib/drafts/bountyDraft';
import { POST_LIMITS } from '../../../src/lib/money';
import { BOUNTY_CATEGORIES } from '../../../src/lib/stickers/category';
import { parseAskReply } from '../../../src/features/ask/askReply';
import { fakeProvider } from './provider.ts';
import { TOOL_SCHEMAS, validToolResult } from './tools.ts';

const schema = TOOL_SCHEMAS.draft_bounty.parameters;

const VALID = {
  title: '帮取快递',
  category: 'pickup',
  rewardMajor: 8,
  currency: 'MYR',
  description: '放门口',
  deadlineAt: '2026-11-09T20:00:00+08:00',
  startsAt: null,
  endsAt: null,
  placeHint: 'Sunway Geo',
};

describe('the draft_bounty tool and the app contract', () => {
  test('name the same fields', () => {
    expect(Object.keys(schema.properties!).sort()).toEqual([...BOUNTY_DRAFT_FIELDS].sort());
    expect([...schema.required!].sort()).toEqual([...BOUNTY_DRAFT_FIELDS].sort());
    expect(schema.additionalProperties).toBe(false);
  });

  test('share the limits, categories and currencies', () => {
    expect(schema.properties!.title.maxLength).toBe(BOUNTY_DRAFT_LIMITS.titleMax);
    expect(schema.properties!.description.maxLength).toBe(BOUNTY_DRAFT_LIMITS.descriptionMax);
    expect(schema.properties!.placeHint.maxLength).toBe(BOUNTY_DRAFT_LIMITS.placeHintMax);
    expect(schema.properties!.category.enum).toEqual([...BOUNTY_CATEGORIES, null]);
    expect(schema.properties!.currency.enum).toEqual([...Object.keys(POST_LIMITS.bounty), null]);
  });

  test('what the fake provider drafts, the app parses', async () => {
    const reply = await fakeProvider.generate(
      {
        task: 'draft_bounty',
        input: { text: 'x'.repeat(2000) },
        tools: [TOOL_SCHEMAS.draft_bounty],
      },
      new AbortController().signal,
    );
    expect(validToolResult('draft_bounty', reply.arguments)).toBe(true);
    expect(parseBountyDraft(reply.arguments).ok).toBe(true);
  });

  test.each<[string, Record<string, unknown>, boolean]>([
    ['a complete draft', {}, true],
    [
      'a window',
      { deadlineAt: null, startsAt: '2026-11-10T10:00:00Z', endsAt: '2026-11-10T11:00:00Z' },
      true,
    ],
    [
      'nothing but a title',
      {
        category: null,
        rewardMajor: null,
        currency: null,
        description: null,
        deadlineAt: null,
        placeHint: null,
      },
      true,
    ],
    ['an extra field', { publish: true }, false],
    ['a blank title', { title: ' ' }, false],
    ['a title of 60 emoji', { title: '😀'.repeat(60) }, true],
    ['a title of 61 emoji', { title: '😀'.repeat(61) }, false],
    ['an unknown category', { category: 'massage' }, false],
    ['a fractional reward', { rewardMajor: 1.5 }, false],
    ['a zero reward', { rewardMajor: 0 }, false],
    ['an unknown currency', { currency: 'USD' }, false],
    ['a blank description', { description: ' ' }, false],
    ['a long place hint', { placeHint: 'x'.repeat(81) }, false],
    ['a time with no offset', { deadlineAt: '2026-11-10T10:00:00' }, false],
    ['a day that does not exist', { deadlineAt: '2026-11-31T10:00:00+08:00' }, false],
    ['more fraction digits than a date holds', { deadlineAt: '2026-11-10T10:00:00.1234Z' }, false],
    ['a deadline and a start', { startsAt: '2026-11-10T10:00:00Z' }, false],
    ['a start alone', { deadlineAt: null, startsAt: '2026-11-10T10:00:00Z' }, false],
    ['an end alone', { deadlineAt: null, endsAt: '2026-11-10T10:00:00Z' }, false],
    [
      'a window that ends first',
      { deadlineAt: null, startsAt: '2026-11-10T11:00:00Z', endsAt: '2026-11-10T10:00:00Z' },
      false,
    ],
  ])('server and app agree on %s', (_name, change, accepted) => {
    const value = { ...VALID, ...change };
    expect(validToolResult('draft_bounty', value)).toBe(accepted);
    expect(parseBountyDraft(value).ok).toBe(accepted);
  });
});

describe('the sheet tools and the app', () => {
  const ITEM = { summary: '搬家具', draft: VALID };
  test.each<[string, 'answer' | 'clarify' | 'pick', unknown, boolean]>([
    ['an answer', 'answer', { text: '好' }, true],
    ['a blank answer', 'answer', { text: '  ' }, false],
    ['a question', 'clarify', { question: '什么时候要？', choices: ['今晚'] }, true],
    ['a blank question', 'clarify', { question: ' ', choices: ['今晚'] }, false],
    ['a blank choice', 'clarify', { question: '?', choices: [' '] }, false],
    ['four choices', 'clarify', { question: '?', choices: ['a', 'b', 'c', 'd'] }, false],
    ['a pick of two', 'pick', { items: [ITEM, ITEM] }, true],
    ['a pick of one', 'pick', { items: [ITEM] }, false],
    ['a blank summary', 'pick', { items: [ITEM, { ...ITEM, summary: ' ' }] }, false],
    [
      'a pick with a broken time',
      'pick',
      { items: [ITEM, { ...ITEM, draft: { ...VALID, startsAt: '2026-11-10T10:00:00Z' } }] },
      false,
    ],
  ])('server and app agree on %s', (_name, tool, result, accepted) => {
    expect(validToolResult(tool, result)).toBe(accepted);
    expect(parseAskReply({ tool, result }) !== null).toBe(accepted);
  });
});
