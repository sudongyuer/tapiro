import { describe, expect, test } from 'bun:test';

import {
  createFixtureAuthService,
  fixtureUnsettledPayment,
  fixtureUser,
} from './fixtureAuthService';

describe('fixture auth service', () => {
  test('starts signed out', () => {
    expect(createFixtureAuthService().getState()).toEqual({ status: 'signedOut' });
  });

  test('signs in as the fixture user for the tapped provider and notifies', async () => {
    const service = createFixtureAuthService();
    let notified = 0;
    service.subscribe(() => notified++);
    expect(await service.signIn('google')).toEqual({ ok: true });
    expect(service.getState()).toEqual({ status: 'signedIn', user: fixtureUser('google') });
    expect(notified).toBe(1);
  });

  test('sign out and delete return to signed out', async () => {
    const service = createFixtureAuthService();
    await service.signIn('apple');
    await service.signOut();
    expect(service.getState()).toEqual({ status: 'signedOut' });
    expect(await service.deleteAccount()).toEqual({ ok: false, reason: 'signedOut' });
    await service.signIn('apple');
    expect(await service.deleteAccount()).toEqual({ ok: true });
    expect(service.getState()).toEqual({ status: 'signedOut' });
  });

  test('unsubscribed listeners are not called', async () => {
    const service = createFixtureAuthService();
    let notified = 0;
    const unsubscribe = service.subscribe(() => notified++);
    unsubscribe();
    await service.signIn('apple');
    expect(notified).toBe(0);
  });

  test('a blocked fixture stays signed in when deletion is refused', async () => {
    const service = createFixtureAuthService({ signedInAs: 'apple', deletion: 'blocked' });
    expect(service.getState()).toEqual({ status: 'signedIn', user: fixtureUser('apple') });
    expect(await service.deleteAccount()).toEqual({
      ok: false,
      reason: 'blocked',
      payments: [fixtureUnsettledPayment],
    });
    expect(service.getState().status).toBe('signedIn');
  });
});
