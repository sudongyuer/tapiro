import { describe, expect, test } from 'bun:test';

import { liveActivityState, type ContentState } from './liveActivityContent.ts';
import {
  planLiveActivityWork,
  type LiveActivityDevice,
  type LiveActivityWork,
} from './liveActivityPlan.ts';

const NOW = Date.parse('2026-11-26T05:08:30Z');
const minutes = (n: number) => new Date(NOW + n * 60_000).toISOString();
const seconds = (iso: string) => Math.floor(Date.parse(iso) / 1000);

const BOUNTY = '43000000-0000-0000-0000-000000000001';
const RIDE = '42000000-0000-0000-0000-000000000001';
const BOUNTY_LINK = `tapiro://bounty/status/${BOUNTY}`;
const RIDE_LINK = `tapiro://ride/${RIDE}`;
const START = 'ab'.repeat(40);
const long = (link: string) => ({ link, at: minutes(-60) });
const ACTIVITY = 'cd'.repeat(40);

const onTheWay = (etaIn = 6) => ({
  kind: 'bounty',
  id: BOUNTY,
  phase: 'onTheWay',
  helper: '小林',
  place: '图书馆',
  task: '帮取快递',
  leftAt: minutes(-4),
  etaAt: minutes(etaIn),
});

const arrived = (doneAgo: number) => ({
  kind: 'bounty',
  id: BOUNTY,
  phase: 'arrived',
  helper: '小林',
  place: '图书馆',
  leftAt: minutes(-20),
  arrivedAt: minutes(-doneAgo),
});

const meetup = (departIn: number) => ({
  kind: 'ride',
  id: RIDE,
  phase: 'meetup',
  startName: 'Sunway Geo',
  startHome: false,
  gatherAt: minutes(departIn - 30),
  departAt: minutes(departIn),
  arrived: 1,
  total: 3,
});

const device = (overrides: Partial<LiveActivityDevice> = {}): LiveActivityDevice => ({
  startToken: START,
  environment: 'production',
  language: 'zh-Hans',
  timeZone: 'Asia/Kuala_Lumpur',
  clock: 'h23',
  activities: [],
  ...overrides,
});

const work = (overrides: Partial<LiveActivityWork> = {}): LiveActivityWork => ({
  userId: 'u1',
  version: 1,
  urgent: false,
  subjects: [],
  started: [],
  devices: [device()],
  ...overrides,
});

type Aps = Record<string, unknown>;
const apsOf = (payload: unknown) => (payload as { aps: Aps }).aps;

describe('planLiveActivityWork', () => {
  test('a running activity gets the current content, quietly on the minute tick and at once after an event', () => {
    const running = device({
      activities: [{ token: ACTIVITY, link: BOUNTY_LINK, lastContent: null }],
    });
    const [tick] = planLiveActivityWork(work({ subjects: [onTheWay()], devices: [running] }), NOW);
    expect(tick.push.to).toBe(ACTIVITY);
    expect(tick.push.priority).toBe(5);
    const aps = apsOf(tick.push.payload);
    expect(aps.event).toBe('update');
    expect(aps.timestamp).toBe(Math.floor(NOW / 1000));
    expect(aps['stale-date']).toBe(seconds(minutes(11)));
    expect((aps['content-state'] as ContentState).title).toBe('小林 · 约 6 分钟到');
    expect((aps['content-state'] as ContentState).endLabel).toBe('约 13:14 到');
    expect(tick.record).toEqual({
      kind: 'content',
      token: ACTIVITY,
      content: aps['content-state'] as ContentState,
    });

    const [urgent] = planLiveActivityWork(
      work({ urgent: true, subjects: [onTheWay()], devices: [running] }),
      NOW,
    );
    expect(urgent.push.priority).toBe(10);
  });

  test('content that has not changed since the last push is not sent again', () => {
    const subjects = [onTheWay()];
    const [first] = planLiveActivityWork(
      work({
        subjects,
        devices: [
          device({ activities: [{ token: ACTIVITY, link: BOUNTY_LINK, lastContent: null }] }),
        ],
      }),
      NOW,
    );
    const lastContent = (first.record as { content: ContentState }).content;
    const again = planLiveActivityWork(
      work({
        subjects,
        devices: [device({ activities: [{ token: ACTIVITY, link: BOUNTY_LINK, lastContent }] })],
      }),
      NOW,
    );
    expect(again).toEqual([]);
  });

  test('the final step ends the activity with its content, dismissed 15 minutes after it happened (277 A)', () => {
    const [end] = planLiveActivityWork(
      work({
        subjects: [arrived(4)],
        devices: [
          device({ activities: [{ token: ACTIVITY, link: BOUNTY_LINK, lastContent: null }] }),
        ],
      }),
      NOW,
    );
    const aps = apsOf(end.push.payload);
    expect(aps.event).toBe('end');
    expect(aps['dismissal-date']).toBe(seconds(minutes(11)));
    expect((aps['content-state'] as ContentState).title).toBe('小林到了 · 图书馆');
    expect(end.push.priority).toBe(10);
    expect(end.record).toEqual({ kind: 'ended', token: ACTIVITY });
  });

  test('an item that is gone (cancelled, blocked, left behind) ends at once with the last content shown', () => {
    const lastContent = liveActivityState(
      {
        kind: 'bounty',
        id: BOUNTY,
        phase: 'onTheWay',
        helper: '小林',
        place: null,
        task: '帮取快递',
        leftAt: NOW - 60_000,
        etaAt: NOW + 60_000,
      },
      { language: 'en', timeZone: 'UTC', clock: 'h23' },
      NOW,
    );
    const [end] = planLiveActivityWork(
      work({
        devices: [device({ activities: [{ token: ACTIVITY, link: BOUNTY_LINK, lastContent }] })],
      }),
      NOW,
    );
    const aps = apsOf(end.push.payload);
    expect(aps.event).toBe('end');
    expect(aps['dismissal-date']).toBeLessThan(Math.floor(NOW / 1000));
    expect(aps['content-state']).toEqual(lastContent);
  });

  test('an unreadable row leaves its activity alone and starts nothing else', () => {
    const planned = planLiveActivityWork(
      work({
        subjects: [{ kind: 'bounty', id: BOUNTY, phase: 'onTheWay' }, meetup(20)],
        devices: [
          device({ activities: [{ token: ACTIVITY, link: BOUNTY_LINK, lastContent: null }] }),
        ],
      }),
      NOW,
    );
    expect(planned).toEqual([]);
  });

  test('a device with nothing running is push-started with the item due soonest, with an alert and the attributes', () => {
    const [start] = planLiveActivityWork(
      work({ subjects: [meetup(20), onTheWay(6)], devices: [device({ language: 'en' })] }),
      NOW,
    );
    expect(start.push.to).toBe(START);
    expect(start.push.priority).toBe(10);
    const aps = apsOf(start.push.payload);
    expect(aps.event).toBe('start');
    expect(aps['attributes-type']).toBe('TapiroActivityAttributes');
    expect(aps.attributes).toEqual({ kind: 'bounty', link: BOUNTY_LINK });
    expect(aps['input-push-token']).toBe(1);
    expect(aps.alert).toEqual({ title: '小林 · about 6 min away', body: '图书馆 · 帮取快递' });
    expect(aps.sound).toBeUndefined();
    expect(start.record).toEqual({
      kind: 'started',
      token: START,
      link: BOUNTY_LINK,
      content: aps['content-state'] as ContentState,
    });
  });

  test('ties go to the bounty; an item already started (or swiped away) is never started again', () => {
    const tie = planLiveActivityWork(work({ subjects: [meetup(6), onTheWay(6)] }), NOW);
    expect(apsOf(tie[0].push.payload).attributes).toEqual({ kind: 'bounty', link: BOUNTY_LINK });
    const next = planLiveActivityWork(
      work({ subjects: [meetup(6), onTheWay(6)], started: [long(BOUNTY_LINK)] }),
      NOW,
    );
    expect(apsOf(next[0].push.payload).attributes).toEqual({ kind: 'ride', link: RIDE_LINK });
    expect(
      planLiveActivityWork(work({ subjects: [onTheWay()], started: [long(BOUNTY_LINK)] }), NOW),
    ).toEqual([]);
  });

  test('a push-started activity whose token has not arrived yet still blocks the next start for ten minutes', () => {
    const pending = { link: BOUNTY_LINK, at: minutes(-2) };
    const blocked = planLiveActivityWork(
      work({ subjects: [onTheWay(6), meetup(20)], started: [pending] }),
      NOW,
    );
    expect(blocked).toEqual([]);
    const settled = planLiveActivityWork(
      work({ subjects: [onTheWay(6), meetup(20)], started: [{ ...pending, at: minutes(-11) }] }),
      NOW,
    );
    expect(apsOf(settled[0].push.payload).attributes).toEqual({ kind: 'ride', link: RIDE_LINK });
  });

  test('one activity at a time per device: a running one blocks a start; a device without a start token gets none', () => {
    const running = device({
      activities: [{ token: ACTIVITY, link: RIDE_LINK, lastContent: null }],
    });
    const planned = planLiveActivityWork(
      work({ subjects: [meetup(20), onTheWay(6)], started: [long(RIDE_LINK)], devices: [running] }),
      NOW,
    );
    expect(planned.map((item) => apsOf(item.push.payload).event)).toEqual(['update']);
    expect(
      planLiveActivityWork(
        work({ subjects: [onTheWay()], devices: [device({ startToken: null })] }),
        NOW,
      ),
    ).toEqual([]);
  });

  test('each device is written in its own language, time zone and clock', () => {
    const [zh, en] = planLiveActivityWork(
      work({
        subjects: [onTheWay()],
        devices: [device(), device({ language: 'en', timeZone: 'America/New_York', clock: 'h12' })],
      }),
      NOW,
    );
    expect((apsOf(zh.push.payload)['content-state'] as ContentState).endLabel).toBe('约 13:14 到');
    expect((apsOf(en.push.payload)['content-state'] as ContentState).endLabel).toBe(
      'Arrives ~12:14 AM',
    );
  });
});
