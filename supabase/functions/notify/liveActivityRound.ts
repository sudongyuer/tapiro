import type { LiveActivitySender } from './apns.ts';
import { UNREGISTERED, type SendResult } from './handler.ts';
import type { ContentState } from './liveActivityContent.ts';
import { planLiveActivityWork, type LiveActivityWork } from './liveActivityPlan.ts';

export type LiveActivityOutcome = {
  contents: { token: string; content: ContentState }[];
  ended: string[];
  dropped: string[];
  started: { link: string; content: ContentState }[];
};

export type LiveActivityDeps = {
  claim(maxRows: number): Promise<LiveActivityWork[]>;
  finish(userId: string, version: number, outcome: LiveActivityOutcome): Promise<void>;
  sender: LiveActivitySender;
  now: () => number;
};

export type LiveActivityTally = { sent: number; failed: number; unfinished: number };

const BATCH = 50;
const MAX_ROUNDS = 10;

async function send(sender: LiveActivitySender, pushes: Parameters<LiveActivitySender['send']>[0]) {
  if (pushes.length === 0) return [];
  try {
    const answers = await sender.send(pushes);
    return pushes.map(
      (_, index): SendResult => answers[index] ?? { ok: false, error: 'no_ticket' },
    );
  } catch {
    return pushes.map((): SendResult => ({ ok: false, error: 'send_failed' }));
  }
}

async function runWork(deps: LiveActivityDeps, work: LiveActivityWork, tally: LiveActivityTally) {
  const planned = planLiveActivityWork(work, deps.now());
  const results = await send(
    deps.sender,
    planned.map(({ push }) => push),
  );
  const outcome: LiveActivityOutcome = { contents: [], ended: [], dropped: [], started: [] };
  for (const [index, { record }] of planned.entries()) {
    const result = results[index];
    if (!result.ok) {
      tally.failed += 1;
      if (result.error === UNREGISTERED) outcome.dropped.push(record.token);
      continue;
    }
    tally.sent += 1;
    if (record.kind === 'content')
      outcome.contents.push({ token: record.token, content: record.content });
    else if (record.kind === 'ended') outcome.ended.push(record.token);
    else if (!outcome.started.some((entry) => entry.link === record.link)) {
      outcome.started.push({ link: record.link, content: record.content });
    }
  }
  try {
    await deps.finish(work.userId, work.version, outcome);
  } catch {
    tally.unfinished += 1;
  }
}

export async function runLiveActivities(deps: LiveActivityDeps): Promise<LiveActivityTally> {
  const tally: LiveActivityTally = { sent: 0, failed: 0, unfinished: 0 };
  for (let rounds = 0; rounds < MAX_ROUNDS; rounds += 1) {
    const due = await deps.claim(BATCH);
    if (due.length === 0) break;
    for (const work of due) await runWork(deps, work, tally);
  }
  return tally;
}
