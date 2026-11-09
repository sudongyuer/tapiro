export const DRAFTS_PER_FULL_BELLY = 3;
export const SENTENCES_PER_FULL_BELLY = 30;

// NOT MEASURED. Gap 3 of docs/plans/2026-10-30-ask-tapir.md asks for the median of 20 recorded prompts per task, which
// needs a Model Studio account. Until then the draft figure is the research's assumption (3K in, 600 out;
// docs/research/2026-10-04-ai-providers.md section 3) and the sentence figure follows from 3 drafts = 30 sentences.
export const UNMEASURED_PLACEHOLDER_BUDGET = {
  measured: false,
  medianDraftTokens: 3600,
  medianSentenceTokens: 360,
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
