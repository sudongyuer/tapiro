import { describe, expect, test } from 'bun:test';

import {
  DRAFTS_PER_FULL_BELLY,
  energyCost,
  fullBellyTokens,
  PLACEHOLDER_FULL_BELLY_TOKENS,
  SENTENCES_PER_FULL_BELLY,
  transcribeTokens,
  UNMEASURED_PLACEHOLDER_BUDGET,
  usdPerBudgetToken,
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

describe('speech priced in belly tokens', () => {
  test('a second of speech costs what the same money buys of a plus draft', () => {
    expect(usdPerBudgetToken()).toBeCloseTo(0.6e-6, 12);
    expect(transcribeTokens(1)).toBe(59);
    expect(transcribeTokens(6)).toBe(350);
  });

  test('part of a second is billed as a whole one, and nothing as one', () => {
    expect(transcribeTokens(0)).toBe(transcribeTokens(1));
    expect(transcribeTokens(5.2)).toBe(transcribeTokens(6));
  });

  test('a full 60 s recording costs about one draft, a short one about a sentence', () => {
    const full = PLACEHOLDER_FULL_BELLY_TOKENS;
    const minute = energyCost(transcribeTokens(60), full, FULL);
    const draft = energyCost(UNMEASURED_PLACEHOLDER_BUDGET.medianDraftTokens, full, FULL);
    expect(Math.abs(minute - draft)).toBeLessThanOrEqual(draft * 0.05);
    expect(transcribeTokens(6)).toBeLessThanOrEqual(
      UNMEASURED_PLACEHOLDER_BUDGET.medianSentenceTokens,
    );
  });
});
