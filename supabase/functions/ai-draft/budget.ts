import { SINGAPORE_PRICES_USD } from './models.ts';

export const DRAFTS_PER_FULL_BELLY = 3;
export const SENTENCES_PER_FULL_BELLY = 30;

// NOT MEASURED. Gap 3 of docs/plans/2026-10-30-ask-tapir.md asks for the median of 20 recorded prompts per task, which
// needs a Model Studio account. Until then the draft figure is the research's assumption (3K in, 600 out;
// docs/research/2026-10-04-ai-providers.md section 3) and the sentence figure follows from 3 drafts = 30 sentences.
export const UNMEASURED_PLACEHOLDER_BUDGET = {
  measured: false,
  medianDraftTokens: 3600,
  medianSentenceTokens: 360,
  draftInputShare: 3000 / 3600,
} as const;

export function fullBellyTokens(medianDraftTokens: number) {
  return medianDraftTokens * DRAFTS_PER_FULL_BELLY;
}

export function energyCost(tokens: number, fullTokens: number, energyFull: number) {
  return Math.min(energyFull, Math.ceil((tokens * energyFull) / fullTokens));
}

export const PLACEHOLDER_FULL_BELLY_TOKENS = fullBellyTokens(
  UNMEASURED_PLACEHOLDER_BUDGET.medianDraftTokens,
);

// Speech is billed per second, the belly in tokens: a second costs the tokens a Qwen plus draft would buy for the same
// money, so a minute of speech eats about what one draft does.
export function usdPerBudgetToken() {
  const share = UNMEASURED_PLACEHOLDER_BUDGET.draftInputShare;
  const perMillion =
    share * SINGAPORE_PRICES_USD.plusInputPerMillion +
    (1 - share) * SINGAPORE_PRICES_USD.plusOutputPerMillion;
  return perMillion / 1_000_000;
}

export function transcribeTokens(seconds: number) {
  const billed = Math.max(1, Math.ceil(seconds));
  return Math.ceil((billed * SINGAPORE_PRICES_USD.asrPerSecond) / usdPerBudgetToken());
}
