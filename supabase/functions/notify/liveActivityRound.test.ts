import { describe, expect, test } from 'bun:test';

import type { LiveActivityPush } from './apns.ts';
import type { SendResult } from './handler.ts';
import type { LiveActivityDevice, LiveActivityWork } from './liveActivityPlan.ts';
import { runLiveActivities, type LiveActivityOutcome } from './liveActivityRound.ts';

const NOW = Date.parse('2026-11-26T05:08:30Z');
const BOUNTY = '43000000-0000-0000-0000-000000000001';
const LINK = `tapiro://bounty/status/${BOUNTY}`;
const GONE_LINK = 'tapiro://ride/42000000-0000-0000-0000-000000000009';

const subject = {
  kind: 'bounty',
  id: BOUNTY,
  phase: 'onTheWay',
  helper: '小林',
  place: '图书馆',
  task: '帮取快递',
  leftAt: new Date(NOW - 4 * 60_000).toISOString(),
  etaAt: new Date(NOW + 6 * 60_000).toISOString(),
};

const device = (overrides: Partial<LiveActivityDevice>): LiveActivityDevice => ({
  startToken: null,
  environment: 'sandbox',
  language: 'zh-Hans',
  timeZone: 'Asia/Kuala_Lumpur',
  clock: 'h23',
  activities: [],
  ...overrides,
});

function harness(queue: LiveActivityWork[][], answer: (push: LiveActivityPush) => SendResult) {
  const finished: { userId: string; version: number; outcome: LiveActivityOutcome }[] = [];
  const sent: LiveActivityPush[] = [];
  return {
    finished,
    sent,
    deps: {
      claim: async () => queue.shift() ?? [],
      finish: async (userId: string, version: number, outcome: LiveActivityOutcome) => {
        finished.push({ userId, version, outcome });
      },
      sender: {
        send: async (pushes: LiveActivityPush[]) => {
          sent.push(...pushes);
          return pushes.map(answer);
        },
      },
      now: () => NOW,
    },
  };
}

describe('runLiveActivities', () => {
  test('records only what APNs took: content, ends and one start per item; a gone token is dropped', async () => {
    const work: LiveActivityWork = {
      userId: 'u1',
      version: 3,
      urgent: true,
      subjects: [subject],
      started: [],
      devices: [
        device({ startToken: 'a1'.repeat(40) }),
        device({ startToken: 'a2'.repeat(40) }),
        device({ startToken: 'a3'.repeat(40) }),
        device({
          activities: [
            { token: 'c1'.repeat(40), link: LINK, lastContent: null },
            { token: 'c2'.repeat(40), link: GONE_LINK, lastContent: null },
          ],
        }),
      ],
    };
    const answers: Record<string, SendResult> = {
      ['a2'.repeat(40)]: { ok: false, error: 'Unregistered' },
      ['a3'.repeat(40)]: { ok: false, error: 'apns_429_TooManyRequests' },
    };
    const { deps, finished, sent } = harness([[work]], (push) => answers[push.to] ?? { ok: true });
    const tally = await runLiveActivities(deps);

    expect(sent).toHaveLength(5);
    expect(tally).toEqual({ sent: 3, failed: 2, unfinished: 0 });
    expect(finished).toHaveLength(1);
    const { userId, version, outcome } = finished[0];
    expect([userId, version]).toEqual(['u1', 3]);
    expect(outcome.started.map((entry) => entry.link)).toEqual([LINK]);
    expect(outcome.started[0].content.title).toBe('小林 · 约 6 分钟到');
    expect(outcome.dropped).toEqual(['a2'.repeat(40)]);
    expect(outcome.ended).toEqual(['c2'.repeat(40)]);
    expect(outcome.contents.map((entry) => entry.token)).toEqual(['c1'.repeat(40)]);
    expect(outcome.contents[0].content.title).toBe('小林 · 约 6 分钟到');
  });

  test('a send that throws records nothing, and a failed finish is counted as unfinished', async () => {
    const work: LiveActivityWork = {
      userId: 'u1',
      version: 1,
      urgent: false,
      subjects: [subject],
      started: [],
      devices: [device({ startToken: 'a1'.repeat(40) })],
    };
    const { deps } = harness([[work]], () => ({ ok: true }));
    const finishes: LiveActivityOutcome[] = [];
    const tally = await runLiveActivities({
      ...deps,
      sender: {
        send: async () => {
          throw new Error('down');
        },
      },
      finish: async (_user, _version, outcome) => {
        finishes.push(outcome);
        throw new Error('db down');
      },
    });
    expect(finishes).toEqual([{ contents: [], ended: [], dropped: [], started: [] }]);
    expect(tally).toEqual({ sent: 0, failed: 1, unfinished: 1 });
  });

  test('keeps claiming until nothing is due, so work re-queued during a run is not left for the tick', async () => {
    const work = (version: number): LiveActivityWork => ({
      userId: 'u1',
      version,
      urgent: true,
      subjects: [],
      started: [],
      devices: [],
    });
    const { deps, finished } = harness([[work(1)], [work(2)]], () => ({ ok: true }));
    await runLiveActivities(deps);
    expect(finished.map((entry) => entry.version)).toEqual([1, 2]);
  });
});
