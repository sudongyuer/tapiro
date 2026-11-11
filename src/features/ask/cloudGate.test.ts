import { describe, expect, test } from 'bun:test';

import type { CloudAnswer, CloudRequest } from './cloudGate';
import { createCloudGate } from './cloudGate';
import type { AskService, ConsentStatus } from './consent';
import { consentAccess, createConsentStore } from './consentStore';

const REQUEST: CloudRequest = { task: 'answer', input: { text: 'hi' } };
const AT = '2026-11-12T03:00:00.000Z';

async function gateWith(first: ConsentStatus | null, answers: CloudAnswer[]) {
  const sent: CloudRequest[] = [];
  const server = { status: first };
  const service: AskService = {
    status: async () => {
      if (!server.status) throw new Error('offline');
      return server.status;
    },
    recordConsent: async () => ({ ok: false, failure: 'failed' }),
    withdrawConsent: async () => ({ ok: false, failure: 'failed' }),
  };
  const store = createConsentStore(service);
  store.start('u1');
  await new Promise((resolve) => setTimeout(resolve, 0));
  const call = createCloudGate({
    store,
    send: async (request) => {
      sent.push(request);
      return answers.shift() ?? { ok: true, body: null };
    },
  });
  return { call, sent, store, server };
}

describe('cloud gate', () => {
  test('no call leaves the app before consent', async () => {
    const gate = await gateWith({ currentVersion: 1, given: false, acceptedAt: null }, []);
    expect(await gate.call(REQUEST)).toEqual({ kind: 'consentRequired' });
    expect(gate.sent).toHaveLength(0);
  });

  test('an unknown status is unavailable, never "consent required", and sends nothing', async () => {
    const gate = await gateWith(null, []);
    expect(await gate.call(REQUEST)).toEqual({ kind: 'unavailable' });
    expect(gate.sent).toHaveLength(0);
  });

  test('a newer consent version blocks the call until the app updates', async () => {
    const gate = await gateWith({ currentVersion: 2, given: false, acceptedAt: null }, []);
    expect(await gate.call(REQUEST)).toEqual({ kind: 'needsUpdate' });
    expect(gate.sent).toHaveLength(0);
  });

  test('with consent the request goes out once', async () => {
    const gate = await gateWith({ currentVersion: 1, given: true, acceptedAt: AT }, [
      { ok: true, body: { task: 'answer' } },
    ]);
    expect(await gate.call(REQUEST)).toEqual({ kind: 'answered', body: { task: 'answer' } });
    expect(gate.sent).toEqual([REQUEST]);
  });

  test('consent withdrawn on another device: the server refusal turns it off here', async () => {
    const gate = await gateWith({ currentVersion: 1, given: true, acceptedAt: AT }, [
      { ok: false, error: 'consent_required', status: 403 },
    ]);
    gate.server.status = { currentVersion: 1, given: false, acceptedAt: null };
    expect(await gate.call(REQUEST)).toEqual({ kind: 'consentRequired' });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(consentAccess(gate.store.getSnapshot())).toBe('notGiven');
    expect(await gate.call(REQUEST)).toEqual({ kind: 'consentRequired' });
    expect(gate.sent).toHaveLength(1);
  });

  test('other failures pass through and are not retried', async () => {
    const gate = await gateWith({ currentVersion: 1, given: true, acceptedAt: AT }, [
      { ok: false, error: 'provider_error', status: 502 },
    ]);
    expect(await gate.call(REQUEST)).toEqual({ kind: 'failed', error: 'provider_error' });
    expect(gate.sent).toHaveLength(1);
  });
});
