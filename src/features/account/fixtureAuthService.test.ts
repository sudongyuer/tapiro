import { describe, expect, test } from 'bun:test';

import { createFixtureAuthService, fixtureUser } from './fixtureAuthService';

describe('fixture auth service', () => {
  test('starts signed out with every provider configured', () => {
    const service = createFixtureAuthService();
    expect(service.getState()).toEqual({ status: 'signedOut' });
    expect(service.isProviderConfigured('apple')).toBe(true);
    expect(service.isProviderConfigured('google')).toBe(true);
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
});
