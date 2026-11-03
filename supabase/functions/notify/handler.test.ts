import { describe, expect, test } from 'bun:test';

import {
  handleNotify,
  type DuePush,
  type NotifyDeps,
  type OutgoingPush,
  type SendResult,
} from './handler';
import { localizedCopy } from './copy';
import { recordingSender, type RecordedPushInsert } from './recording-sender';

const post = (token?: string) =>
  new Request('http://localhost/notify', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

const due = (queueId: number, overrides: Partial<DuePush> = {}): DuePush => ({
  queueId,
  kind: 'bounty.selected',
  subjectId: `bounty-${queueId}`,
  threadId: `bounty:bounty-${queueId}`,
  actorName: 'Alice',
  subject: { title: '帮取快递' },
  tokens: [{ token: `ExponentPushToken[${queueId}]`, language: 'en' }],
  ...overrides,
});

function harness(batches: DuePush[][], answer?: (push: OutgoingPush) => SendResult) {
  const finished: [number, string | null][] = [];
  const dropped: string[] = [];
  const sent: OutgoingPush[] = [];
  const deps: NotifyDeps = {
    authorized: (token) => token === 'service',
    claim: async () => batches.shift() ?? [],
    finish: async (queueId, error) => {
      finished.push([queueId, error]);
    },
    dropToken: async (token) => {
      dropped.push(token);
    },
    copy: localizedCopy,
    sender: {
      send: async (pushes) => {
        sent.push(...pushes);
        return pushes.map((push) => answer?.(push) ?? { ok: true });
      },
    },
  };
  return { deps, finished, dropped, sent };
}

describe('handleNotify', () => {
  test('sends each due push to every token in its language, grouped by thread, with ids only in data', async () => {
    const run = harness([
      [
        due(1, {
          tokens: [
            { token: 'ExponentPushToken[phone]', language: 'zh-Hans' },
            { token: 'ExponentPushToken[ipad]', language: 'ms' },
          ],
        }),
      ],
    ]);
    const res = await handleNotify(post('service'), run.deps);
    expect(await res.json()).toEqual({ sent: 1, failed: 0 });
    expect(run.sent.map((push) => [push.language, push.message])).toEqual([
      [
        'zh-Hans',
        {
          to: 'ExponentPushToken[phone]',
          title: '帮取快递',
          body: 'Alice 选了你来帮忙',
          threadId: 'bounty:bounty-1',
          sound: 'default',
          data: { kind: 'bounty.selected', id: 'bounty-1' },
        },
      ],
      [
        'ms',
        {
          to: 'ExponentPushToken[ipad]',
          title: '帮取快递',
          body: 'Alice memilih anda untuk membantu',
          threadId: 'bounty:bounty-1',
          sound: 'default',
          data: { kind: 'bounty.selected', id: 'bounty-1' },
        },
      ],
    ]);
    expect(run.finished).toEqual([[1, null]]);
  });

  test('a recipient without tokens is finished without sending', async () => {
    const run = harness([[due(2, { tokens: [] })]]);
    await handleNotify(post('service'), run.deps);
    expect(run.sent).toEqual([]);
    expect(run.finished).toEqual([[2, null]]);
  });

  test('drops a token Expo reports as not registered and keeps the push sent to the other device', async () => {
    const run = harness(
      [
        [
          due(3, {
            tokens: [
              { token: 'ExponentPushToken[old]', language: 'en' },
              { token: 'ExponentPushToken[new]', language: 'en' },
            ],
          }),
        ],
      ],
      (push) =>
        push.message.to === 'ExponentPushToken[old]'
          ? { ok: false, error: 'DeviceNotRegistered' }
          : { ok: true },
    );
    await handleNotify(post('service'), run.deps);
    expect(run.dropped).toEqual(['ExponentPushToken[old]']);
    expect(run.finished).toEqual([[3, null]]);
  });

  test('records the error of a push that reached no device, so the server retries it once', async () => {
    const run = harness([[due(4)]], () => ({ ok: false, error: 'MessageRateExceeded' }));
    const res = await handleNotify(post('service'), run.deps);
    expect(await res.json()).toEqual({ sent: 0, failed: 1 });
    expect(run.finished).toEqual([[4, 'MessageRateExceeded']]);
  });

  test('a sender outage fails every push of the batch instead of losing them', async () => {
    const run = harness([[due(5), due(6)]]);
    run.deps.sender = {
      send: async () => {
        throw new Error('expo_down');
      },
    };
    await handleNotify(post('service'), run.deps);
    expect(run.finished).toEqual([
      [5, 'expo_down'],
      [6, 'expo_down'],
    ]);
  });

  test('a kind without copy is failed rather than sent blank', async () => {
    const run = harness([[due(7, { kind: 'bounty.withdrawn' })]]);
    await handleNotify(post('service'), run.deps);
    expect(run.sent).toEqual([]);
    expect(run.finished).toEqual([[7, 'no_copy']]);
  });

  test('keeps claiming while full batches come back', async () => {
    const full = Array.from({ length: 100 }, (_, index) => due(100 + index));
    const run = harness([full, [due(500)]]);
    const res = await handleNotify(post('service'), run.deps);
    expect(await res.json()).toEqual({ sent: 101, failed: 0 });
  });

  test('rejects callers without the service key', async () => {
    const run = harness([[due(8)]]);
    expect((await handleNotify(post('user'), run.deps)).status).toBe(401);
    expect((await handleNotify(post(), run.deps)).status).toBe(401);
    expect(run.finished).toEqual([]);
  });
});

describe('recordingSender', () => {
  test('writes one row per device with the final copy, thread and data', async () => {
    const rows: RecordedPushInsert[] = [];
    const sender = recordingSender({
      insert: async (batch) => {
        rows.push(...batch);
        return { error: null };
      },
    });
    const results = await sender.send([
      {
        queueId: 9,
        language: 'en',
        message: {
          to: 'ExponentPushToken[x]',
          title: 'T',
          body: 'B',
          threadId: 'ride:r',
          sound: 'default',
          data: { kind: 'ride.approved', id: 'r' },
        },
      },
    ]);
    expect(results).toEqual([{ ok: true }]);
    expect(rows).toEqual([
      {
        queue_id: 9,
        token: 'ExponentPushToken[x]',
        language: 'en',
        title: 'T',
        body: 'B',
        thread_id: 'ride:r',
        data: { kind: 'ride.approved', id: 'r' },
      },
    ]);
  });

  test('a failed write is a send failure', async () => {
    const sender = recordingSender({ insert: async () => ({ error: new Error('db') }) });
    await expect(sender.send([])).rejects.toThrow('record_failed');
  });
});
