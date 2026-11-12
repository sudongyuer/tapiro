import { describe, expect, test } from 'bun:test';

import { createSessionEnds } from '@/lib/sessionEnds';

import { createFixtureAuthService, fixtureUser } from './fixtureAuthService';
import { followSessionEnds } from './followSessionEnds';
import { createSessionStore } from './sessionStore';
import type { SessionState } from './types';

describe('follow session ends', () => {
  test('signing out ends the session of the user who was signed in', async () => {
    const auth = createFixtureAuthService({ signedInAs: 'apple' });
    const ends = createSessionEnds();
    const ended: string[] = [];
    ends.register((userId) => ended.push(userId));
    followSessionEnds(auth, ends);
    expect(ended).toEqual([]);
    await auth.signOut();
    expect(ended).toEqual([fixtureUser('apple').id]);
    await auth.signIn('apple');
    expect(ended).toEqual([fixtureUser('apple').id]);
  });

  test('the loading state at launch neither starts nor ends a session', () => {
    const session = createSessionStore({ status: 'loading' } as SessionState);
    const ends = createSessionEnds();
    const ended: string[] = [];
    ends.register((userId) => ended.push(userId));
    followSessionEnds({ getState: session.get, subscribe: session.subscribe }, ends);
    session.set({ status: 'signedIn', user: fixtureUser('google') });
    session.set({ status: 'loading' });
    expect(ended).toEqual([]);
    session.set({ status: 'signedOut' });
    expect(ended).toEqual([fixtureUser('google').id]);
  });
});
