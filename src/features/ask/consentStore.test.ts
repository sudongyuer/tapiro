import { describe, expect, test } from 'bun:test';

import type { AskService, ConsentStatus, WriteResult } from './consent';
import { consentAccess, createConsentStore } from './consentStore';

const AT = '2026-11-12T03:00:00.000Z';
const NOT_GIVEN: ConsentStatus = { currentVersion: 1, given: false, acceptedAt: null };
const GIVEN: ConsentStatus = { currentVersion: 1, given: true, acceptedAt: AT };

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((ok, fail) => {
    resolve = ok;
    reject = fail;
  });
  return { promise, resolve, reject };
}

function harness(first: ConsentStatus = NOT_GIVEN) {
  const calls: string[] = [];
  const reads: ReturnType<typeof deferred<ConsentStatus>>[] = [];
  const writes: ReturnType<typeof deferred<WriteResult>>[] = [];
  const service: AskService = {
    status() {
      calls.push('status');
      const read = deferred<ConsentStatus>();
      reads.push(read);
      return read.promise;
    },
    recordConsent(version) {
      calls.push(`record:${version}`);
      const write = deferred<WriteResult>();
      writes.push(write);
      return write.promise;
    },
    withdrawConsent() {
      calls.push('withdraw');
      const write = deferred<WriteResult>();
      writes.push(write);
      return write.promise;
    },
    pantry: async () => ({ ok: false, failure: 'failed' }),
  };
  const store = createConsentStore(service);
  const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
  const startReady = async () => {
    store.start('u1');
    reads[0].resolve(first);
    await tick();
  };
  return { store, calls, reads, writes, tick, startReady };
}

describe('consent store', () => {
  test('starting reads the status once', async () => {
    const h = harness(GIVEN);
    await h.startReady();
    expect(h.calls).toEqual(['status']);
    expect(consentAccess(h.store.getSnapshot())).toBe('given');
  });

  test('a failed first read is failed, never "not given"', async () => {
    const h = harness();
    h.store.start('u1');
    h.reads[0].reject(new Error('offline'));
    await h.tick();
    expect(h.store.getSnapshot().status.status).toBe('failed');
    expect(consentAccess(h.store.getSnapshot())).toBeNull();
  });

  test('records the version compiled into the app, not the server one', async () => {
    const h = harness({ currentVersion: 2, given: false, acceptedAt: null });
    await h.startReady();
    const recorded = h.store.record();
    expect(h.store.getSnapshot().writing).toBe('record');
    h.writes[0].resolve({ ok: true, status: GIVEN });
    expect(await recorded).toBe(true);
    expect(h.calls).toEqual(['status', 'record:1']);
    expect(consentAccess(h.store.getSnapshot())).toBe('given');
  });

  test('a failed record keeps consent off, says so, and is not replayed', async () => {
    const h = harness();
    await h.startReady();
    const recorded = h.store.record();
    h.writes[0].resolve({ ok: false, failure: 'failed' });
    expect(await recorded).toBe(false);
    await h.tick();
    expect(h.store.getSnapshot().failure).toEqual({ write: 'record', reason: 'failed' });
    expect(consentAccess(h.store.getSnapshot())).toBe('notGiven');
    expect(h.calls.filter((call) => call.startsWith('record'))).toHaveLength(1);
  });

  test('a thrown write is a failure, not a crash', async () => {
    const h = harness();
    await h.startReady();
    const recorded = h.store.record();
    h.writes[0].reject(new Error('socket closed'));
    expect(await recorded).toBe(false);
    expect(h.store.getSnapshot().failure?.reason).toBe('failed');
  });

  test('a read that started before a write cannot undo it', async () => {
    const h = harness();
    await h.startReady();
    const refreshing = h.store.refresh();
    const recorded = h.store.record();
    h.writes[0].resolve({ ok: true, status: GIVEN });
    await recorded;
    h.reads[1].resolve(NOT_GIVEN);
    await refreshing;
    expect(consentAccess(h.store.getSnapshot())).toBe('given');
  });

  test('withdrawing turns the cloud off; a failure keeps it on', async () => {
    const h = harness(GIVEN);
    await h.startReady();
    const failed = h.store.withdraw();
    h.writes[0].resolve({ ok: false, failure: 'failed' });
    expect(await failed).toBe(false);
    expect(consentAccess(h.store.getSnapshot())).toBe('given');
    expect(h.store.getSnapshot().failure).toEqual({ write: 'withdraw', reason: 'failed' });
    const withdrawn = h.store.withdraw();
    h.writes[1].resolve({ ok: true, status: NOT_GIVEN });
    expect(await withdrawn).toBe(true);
    expect(consentAccess(h.store.getSnapshot())).toBe('notGiven');
    expect(h.store.getSnapshot().failure).toBeNull();
  });

  test('a second write while one is out is ignored', async () => {
    const h = harness(GIVEN);
    await h.startReady();
    void h.store.withdraw();
    expect(await h.store.withdraw()).toBe(false);
    expect(h.calls.filter((call) => call === 'withdraw')).toHaveLength(1);
  });

  test('a stale version answer asks for an app update and stops offering consent', async () => {
    const h = harness();
    await h.startReady();
    const asked = h.store.ask().outcome;
    const recorded = h.store.record();
    h.writes[0].resolve({ ok: false, failure: 'needsUpdate' });
    await recorded;
    expect(h.store.getSnapshot().failure).toEqual({ write: 'record', reason: 'needsUpdate' });
    expect(consentAccess(h.store.getSnapshot())).toBe('needsUpdate');
    h.store.decline();
    expect(await asked).toBe('needsUpdate');
    expect(await h.store.prepare()).toBe('needsUpdate');
  });

  test('closing an older consent page cannot settle a newer ask', async () => {
    const h = harness();
    await h.startReady();
    const first = h.store.ask();
    const second = h.store.ask();
    expect(await first.outcome).toBe('declined');
    let outcome: string | null = null;
    void second.outcome.then((value) => {
      outcome = value;
    });
    h.store.decline(first.token);
    await h.tick();
    expect(outcome).toBeNull();
    h.store.decline(second.token);
    await h.tick();
    expect(outcome as string | null).toBe('declined');
  });

  test('a failed write rereads when it dropped a read, so the status never stays loading', async () => {
    const h = harness();
    h.store.start('u1');
    const recorded = h.store.record();
    h.reads[0].resolve(NOT_GIVEN);
    await h.tick();
    h.writes[0].resolve({ ok: false, failure: 'failed' });
    await recorded;
    expect(h.calls).toEqual(['status', 'record:1', 'status']);
    h.reads[1].resolve(NOT_GIVEN);
    await h.tick();
    expect(h.store.getSnapshot().status.status).toBe('ready');
  });

  test('a refusal keeps a stale status stale', async () => {
    const h = harness(GIVEN);
    await h.startReady();
    const refreshing = h.store.refresh();
    h.reads[1].reject(new Error('offline'));
    await refreshing;
    expect(h.store.getSnapshot().status.status).toBe('stale');
    h.store.markRefused();
    expect(h.store.getSnapshot().status.status).not.toBe('ready');
  });

  test('ask resolves given once consent is recorded', async () => {
    const h = harness();
    await h.startReady();
    const asked = h.store.ask().outcome;
    const recorded = h.store.record();
    h.writes[0].resolve({ ok: true, status: GIVEN });
    await recorded;
    expect(await asked).toBe('given');
  });

  test('ask resolves declined when the screen is declined or dismissed', async () => {
    const h = harness();
    await h.startReady();
    const asked = h.store.ask().outcome;
    h.store.decline();
    expect(await asked).toBe('declined');
  });

  test('a failed record leaves the ask open for a retry on the same screen', async () => {
    const h = harness();
    await h.startReady();
    let outcome: string | null = null;
    void h.store.ask().outcome.then((value) => {
      outcome = value;
    });
    const first = h.store.record();
    h.writes[0].resolve({ ok: false, failure: 'failed' });
    await first;
    await h.tick();
    expect(outcome).toBeNull();
    const second = h.store.record();
    h.writes[1].resolve({ ok: true, status: GIVEN });
    await second;
    await h.tick();
    expect(outcome as string | null).toBe('given');
  });

  test('prepare reads the status first when it is not loaded', async () => {
    const h = harness();
    h.store.start('u1');
    h.reads[0].reject(new Error('offline'));
    await h.tick();
    const preparing = h.store.prepare();
    h.reads[1].resolve(NOT_GIVEN);
    expect(await preparing).toBe('notGiven');
  });

  test('prepare answers offline when the status cannot be read', async () => {
    const h = harness();
    h.store.start('u1');
    h.reads[0].reject(new Error('offline'));
    await h.tick();
    const preparing = h.store.prepare();
    h.reads[1].reject(new Error('offline'));
    expect(await preparing).toBe('offline');
  });

  test('a server refusal turns local consent off and rereads', async () => {
    const h = harness(GIVEN);
    await h.startReady();
    h.store.markRefused();
    expect(consentAccess(h.store.getSnapshot())).toBe('notGiven');
    expect(h.calls).toEqual(['status', 'status']);
  });

  test('signing out drops the state and declines an open ask', async () => {
    const h = harness(GIVEN);
    await h.startReady();
    const asked = h.store.ask().outcome;
    h.store.clear();
    expect(await asked).toBe('declined');
    expect(h.store.getSnapshot().userId).toBeNull();
    expect(h.store.getSnapshot().status.status).toBe('idle');
  });

  test('a belly patch survives an older read still out, which is read again', async () => {
    const belly = { energy: 0, full: 1000, leaves: 1, coins: 0, feedsLeft: 5, nextRefillAt: AT };
    const fed = { ...belly, energy: 1000, leaves: 0 };
    const h = harness({ ...GIVEN, belly });
    await h.startReady();
    void h.store.refresh();
    h.store.applyBelly('u1', fed);
    h.reads[1].resolve({ ...GIVEN, belly });
    await h.tick();
    expect(h.store.getSnapshot().status).toEqual({
      status: 'ready',
      data: { ...GIVEN, belly: fed },
    });
    expect(h.calls).toEqual(['status', 'status', 'status']);
    h.reads[2].resolve({ ...GIVEN, belly: fed });
    await h.tick();
    expect(h.store.getSnapshot().status).toEqual({
      status: 'ready',
      data: { ...GIVEN, belly: fed },
    });
  });

  test('a belly patch for another user is ignored', async () => {
    const h = harness(GIVEN);
    await h.startReady();
    h.store.applyBelly('u2', {
      energy: 1,
      full: 1000,
      leaves: 0,
      coins: 0,
      feedsLeft: 5,
      nextRefillAt: AT,
    });
    expect(h.store.getSnapshot().status).toEqual({ status: 'ready', data: GIVEN });
  });
});
