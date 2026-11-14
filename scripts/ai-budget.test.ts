import { describe, expect, test } from 'bun:test';

import { median, proposedBudget, summarize, type MeterRow } from './ai-budget';

const row = (task: string, total: number, discarded = false): MeterRow => ({
  task,
  model: task === 'ask' ? 'qwen3.7-plus-2026-05-26' : 'qwen3.7-flash-2026-07-15',
  input_tokens: total - 100,
  output_tokens: 100,
  discarded,
});

describe('token budget measurement', () => {
  test('the median of an even count is the mean of the middle two', () => {
    expect(median([5, 1, 3, 9])).toBe(4);
    expect(median([7])).toBe(7);
    expect(median([])).toBeNull();
  });

  test('discarded replies are counted but kept out of the median', () => {
    const summary = summarize([
      row('ask', 3000),
      row('ask', 1000),
      row('ask', 2000),
      row('ask', 90000, true),
    ]);
    expect(summary.ask).toEqual({
      calls: 4,
      discarded: 1,
      models: ['qwen3.7-plus-2026-05-26'],
      medianTokens: 2000,
      p90Tokens: 3000,
    });
  });

  test('the belly holds three median drafts and reports how many sentences that buys', () => {
    const summary = summarize([row('ask', 1200), row('translate', 150), row('translate', 170)]);
    expect(proposedBudget(summary)).toEqual({
      medianDraftTokens: 1200,
      medianSentenceTokens: 160,
      fullBellyTokens: 3600,
      sentencesPerBelly: 22,
    });
    expect(proposedBudget(summarize([row('ask', 1200)]))).toBeNull();
  });
});
