import { describe, expect, test } from 'bun:test';

import { createFixtureStatusService } from './fixtureStatusService';
import {
  INITIAL_STATUS,
  inFlight,
  shownDetail,
  statusReducer,
  type StatusEvent,
  type StatusState,
} from './statusState';
import type { StatusDetail } from './types';

const NOW = new Date('2026-10-29T04:00:00.000Z');

const { service } = createFixtureStatusService({
  scenario: 'assigned',
  role: 'helper',
  load: 'ok',
  waiver: 'available',
  now: () => NOW,
});
const loaded = await service.detail('b1');
if (loaded === 'unavailable') throw new Error('unavailable');
const ASSIGNED: StatusDetail = loaded;
const EN_ROUTE: StatusDetail = { ...ASSIGNED, status: 'en_route' };

const run = (state: StatusState, ...events: StatusEvent[]) => events.reduce(statusReducer, state);

const ready = (detail = ASSIGNED) =>
  run(
    INITIAL_STATUS,
    { type: 'loadStarted', request: 1 },
    { type: 'loaded', request: 1, detail, at: '10:00' },
  );

const sending = () => run(ready(), { type: 'actionStarted', action: 'start' });

describe('loading', () => {
  test('a first-load failure is the failed card, never an empty timeline', () => {
    const failed = run(
      INITIAL_STATUS,
      { type: 'loadStarted', request: 1 },
      { type: 'loadFailed', request: 1 },
    );
    expect(failed.load).toEqual({ kind: 'failed', reason: 'failed', retrying: false });
    expect(shownDetail(failed)).toBeNull();
    expect(run(failed, { type: 'loadStarted', request: 2 }).load).toEqual({
      kind: 'failed',
      reason: 'failed',
      retrying: true,
    });
    expect(
      shownDetail(
        run(
          failed,
          { type: 'loadStarted', request: 2 },
          {
            type: 'loaded',
            request: 2,
            detail: ASSIGNED,
            at: '10:01',
          },
        ),
      ),
    ).toBe(ASSIGNED);
  });

  test('a failed refresh keeps the detail with the time of the data', () => {
    const stale = run(
      ready(),
      { type: 'loadStarted', request: 2 },
      { type: 'loadFailed', request: 2 },
    );
    expect(stale.load).toEqual({
      kind: 'ready',
      detail: ASSIGNED,
      loadedAt: '10:00',
      refreshing: false,
      refreshFailed: true,
    });
    const fresh = run(
      stale,
      { type: 'loadStarted', request: 3 },
      { type: 'loaded', request: 3, detail: EN_ROUTE, at: '10:05' },
    );
    expect(fresh.load).toEqual({
      kind: 'ready',
      detail: EN_ROUTE,
      loadedAt: '10:05',
      refreshing: false,
      refreshFailed: false,
    });
  });

  test('a refresh shows refreshing and keeps the detail', () => {
    expect(run(ready(), { type: 'loadStarted', request: 2 }).load).toMatchObject({
      kind: 'ready',
      refreshing: true,
      detail: ASSIGNED,
    });
  });

  test('answers for an older request are dropped', () => {
    const state = run(
      INITIAL_STATUS,
      { type: 'loadStarted', request: 1 },
      { type: 'loadStarted', request: 2 },
    );
    expect(run(state, { type: 'loaded', request: 1, detail: ASSIGNED, at: '10:00' }).load).toEqual({
      kind: 'loading',
    });
    expect(run(state, { type: 'loadFailed', request: 1 }).load).toEqual({ kind: 'loading' });
    expect(run(state, { type: 'unavailable', request: 1 }).load).toEqual({ kind: 'loading' });
    expect(run(ready(), { type: 'loadStarted', request: 1 }).load).toMatchObject({
      refreshing: false,
    });
  });

  test('unavailable replaces even a shown detail with the failed card', () => {
    const state = run(
      ready(),
      { type: 'loadStarted', request: 2 },
      { type: 'unavailable', request: 2 },
    );
    expect(state.load).toEqual({ kind: 'failed', reason: 'unavailable', retrying: false });
    expect(shownDetail(state)).toBeNull();
  });
});

describe('actions', () => {
  test('an action starts only on a shown detail', () => {
    expect(run(INITIAL_STATUS, { type: 'actionStarted', action: 'start' }).action).toEqual({
      kind: 'idle',
    });
    expect(sending().action).toEqual({ kind: 'sending', action: 'start' });
    expect(inFlight(sending(), 'start')).toBe(true);
    expect(inFlight(sending(), 'cancel')).toBe(false);
  });

  test('a second action cannot start while one is in flight', () => {
    const state = sending();
    expect(run(state, { type: 'actionStarted', action: 'cancel' })).toBe(state);
  });

  test('an answer for another action is ignored', () => {
    const state = sending();
    expect(run(state, { type: 'actionAnswered', action: 'cancel', outcome: { ok: true } })).toBe(
      state,
    );
    expect(
      run(ready(), { type: 'actionAnswered', action: 'start', outcome: { ok: true } }).action,
    ).toEqual({ kind: 'idle' });
  });

  test('success keeps the button busy until a load requested afterwards answers', () => {
    const settling = run(sending(), {
      type: 'actionAnswered',
      action: 'start',
      outcome: { ok: true },
    });
    expect(settling.action).toEqual({ kind: 'settling', action: 'start', after: 1 });
    expect(inFlight(settling, 'start')).toBe(true);
    expect(run(settling, { type: 'actionStarted', action: 'start' })).toBe(settling);
    const done = run(
      settling,
      { type: 'loadStarted', request: 2 },
      { type: 'loaded', request: 2, detail: EN_ROUTE, at: '10:05' },
    );
    expect(done.action).toEqual({ kind: 'idle' });
    expect(shownDetail(done)?.status).toBe('en_route');
  });

  test('a load requested before the answer does not release a settling action', () => {
    const state = run(
      ready(),
      { type: 'loadStarted', request: 2 },
      { type: 'actionStarted', action: 'complete' },
      { type: 'actionAnswered', action: 'complete', outcome: { ok: true } },
      { type: 'loaded', request: 2, detail: ASSIGNED, at: '10:05' },
    );
    expect(state.action).toEqual({ kind: 'settling', action: 'complete', after: 2 });
  });

  test('a failed reload after success releases the button over the stale notice', () => {
    const state = run(
      sending(),
      { type: 'actionAnswered', action: 'start', outcome: { ok: true } },
      { type: 'loadStarted', request: 2 },
      { type: 'loadFailed', request: 2 },
    );
    expect(state.action).toEqual({ kind: 'idle' });
    expect(state.load).toMatchObject({ refreshFailed: true });
  });

  test.each(['failed', 'invalid'] as const)(
    '%s returns the button with an inline notice and never resends',
    (reason) => {
      const state = run(sending(), {
        type: 'actionAnswered',
        action: 'start',
        outcome: { ok: false, reason },
      });
      expect(state.action).toEqual({ kind: 'failed', action: 'start', reason });
      expect(inFlight(state, 'start')).toBe(false);
      expect(run(state, { type: 'actionStarted', action: 'start' }).action).toEqual({
        kind: 'sending',
        action: 'start',
      });
      expect(run(state, { type: 'noticeDismissed' }).action).toEqual({ kind: 'idle' });
    },
  );

  test('changed shows the state-changed notice and survives the refresh', () => {
    const state = run(
      sending(),
      { type: 'actionAnswered', action: 'start', outcome: { ok: false, reason: 'changed' } },
      { type: 'loadStarted', request: 2 },
      { type: 'loaded', request: 2, detail: EN_ROUTE, at: '10:05' },
    );
    expect(state.action).toEqual({ kind: 'changed', action: 'start' });
    expect(run(state, { type: 'noticeDismissed' }).action).toEqual({ kind: 'idle' });
  });

  test('unavailable turns the screen into the failed card', () => {
    const state = run(sending(), {
      type: 'actionAnswered',
      action: 'start',
      outcome: { ok: false, reason: 'unavailable' },
    });
    expect(state.load).toEqual({ kind: 'failed', reason: 'unavailable', retrying: false });
    expect(state.action).toEqual({ kind: 'idle' });
  });

  test('dismissing without a notice changes nothing', () => {
    const state = sending();
    expect(run(state, { type: 'noticeDismissed' })).toBe(state);
  });
});
