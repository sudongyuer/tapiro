export type MeterRow = {
  task: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  discarded: boolean;
};

export type TaskSummary = {
  calls: number;
  discarded: number;
  models: string[];
  medianTokens: number | null;
  p90Tokens: number | null;
};

function percentile(sorted: number[], fraction: number) {
  if (sorted.length === 0) return null;
  const index = Math.min(sorted.length - 1, Math.ceil(fraction * sorted.length) - 1);
  return sorted[Math.max(0, index)];
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

export function summarize(rows: MeterRow[]): Record<string, TaskSummary> {
  const byTask = new Map<string, MeterRow[]>();
  for (const row of rows) byTask.set(row.task, [...(byTask.get(row.task) ?? []), row]);
  return Object.fromEntries(
    [...byTask].map(([task, taskRows]) => {
      const kept = taskRows.filter((row) => !row.discarded);
      const totals = kept.map((row) => row.input_tokens + row.output_tokens).sort((a, b) => a - b);
      return [
        task,
        {
          calls: taskRows.length,
          discarded: taskRows.length - kept.length,
          models: [...new Set(taskRows.map((row) => row.model))].sort(),
          medianTokens: median(totals),
          p90Tokens: percentile(totals, 0.9),
        },
      ];
    }),
  );
}

export function proposedBudget(summary: Record<string, TaskSummary>) {
  const draft = summary.ask?.medianTokens ?? null;
  const sentence = summary.translate?.medianTokens ?? null;
  if (draft === null || sentence === null) return null;
  const fullBelly = draft * 3;
  return {
    medianDraftTokens: draft,
    medianSentenceTokens: sentence,
    fullBellyTokens: fullBelly,
    sentencesPerBelly: Math.floor(fullBelly / sentence),
  };
}
