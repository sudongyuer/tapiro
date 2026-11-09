import { describe, expect, test } from 'bun:test';

import {
  DRAFTS_PER_FULL_BELLY,
  energyCost,
  fullBellyTokens,
  PLACEHOLDER_FULL_BELLY_TOKENS,
  SENTENCES_PER_FULL_BELLY,
  UNMEASURED_PLACEHOLDER_BUDGET,
} from './budget.ts';

const FULL = 1000;

function callsUntilEmpty(tokens: number, fullTokens: number) {
  let level = FULL;
  let calls = 0;
  while (level > 0) {
    level = Math.max(0, level - energyCost(tokens, fullTokens, FULL));
    calls += 1;
  }
  return calls;
}

describe('energy ratio', () => {
  test('the belly is sized so the median draft costs a third of it', () => {
    expect(fullBellyTokens(1200)).toBe(3600);
    expect(energyCost(1200, fullBellyTokens(1200), FULL)).toBe(334);
  });

  test('a measured median of any size still gives three drafts', () => {
    for (const median of [500, 1234, 3600, 9999]) {
      expect(callsUntilEmpty(median, fullBellyTokens(median))).toBe(DRAFTS_PER_FULL_BELLY);
    }
  });

  test('cost rounds up so a tiny call still costs something', () => {
    expect(energyCost(1, 10_800, FULL)).toBe(1);
  });

  test('a call that costs nothing charges nothing', () => {
    expect(energyCost(0, 10_800, FULL)).toBe(0);
  });

  test('a huge call costs one full belly at most', () => {
    expect(energyCost(10_000_000, 10_800, FULL)).toBe(FULL);
  });
});

describe('the placeholder budget', () => {
  test('says it is unmeasured', () => {
    expect(UNMEASURED_PLACEHOLDER_BUDGET.measured).toBe(false);
  });

  test('gives about 3 drafts or 30 sentences', () => {
    const { medianDraftTokens, medianSentenceTokens } = UNMEASURED_PLACEHOLDER_BUDGET;
    expect(callsUntilEmpty(medianDraftTokens, PLACEHOLDER_FULL_BELLY_TOKENS)).toBe(3);
    expect(callsUntilEmpty(medianSentenceTokens, PLACEHOLDER_FULL_BELLY_TOKENS)).toBe(
      SENTENCES_PER_FULL_BELLY,
    );
  });
});
