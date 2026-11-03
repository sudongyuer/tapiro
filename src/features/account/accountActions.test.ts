import { describe, expect, test } from 'bun:test';

import { createUserCleanups } from '@/lib/userCleanups';

import { createAccountActions, SIGN_OUT_WAIT_MS } from './accountActions';
import {
  createFixtureAuthService,
  fixtureUnsettledPayment,
  fixtureUser,
} from './fixtureAuthService';
import { createOnboardingStore, memoryOnboardedStorage } from './onboardingStore';
import { createFixtureProfileService } from './profileService';
import { createProfileStore } from './profileStore';
import type { AuthService } from './types';

const user = fixtureUser('apple');

function setup(auth: AuthService) {
  const onboarding = createOnboardingStore(memoryOnboardedStorage([user.id]));
  const profiles = createProfileStore(createFixtureProfileService());
  const cleanups = createUserCleanups();
  const cleaned: string[] = [];
  cleanups.register((userId) => cleaned.push(userId));
  return {
    onboarding,
    profiles,
    cleaned,
    actions: createAccountActions({ auth, onboarding, profiles, cleanups }),
  };
}

describe('account actions', () => {
  test('a deleted account onboards again and loses its profile', async () => {
    const { onboarding, profiles, cleaned, actions } = setup(
      createFixtureAuthService({ signedInAs: 'apple' }),
    );
    await profiles.ensureLoaded(user);
    await profiles.save(user, { displayName: 'Renamed', avatarUrl: null });

    expect(await actions.deleteAccount()).toEqual({ ok: true });
    expect(cleaned).toEqual([user.id]);
    expect(onboarding.getSnapshot().has(user.id)).toBe(false);
    expect(profiles.getSnapshot()).toEqual({ status: 'idle' });
    await profiles.ensureLoaded(user);
    expect(profiles.getSnapshot()).toEqual({
      status: 'ready',
      userId: user.id,
      profile: { displayName: '林小貘', avatarUrl: null },
    });
  });

  test('a blocked deletion keeps the account as it was', async () => {
    const { onboarding, cleaned, actions } = setup(
      createFixtureAuthService({ signedInAs: 'apple', deletion: 'blocked' }),
    );
    expect(await actions.deleteAccount()).toEqual({
      ok: false,
      reason: 'blocked',
      payments: [fixtureUnsettledPayment],
    });
    expect(onboarding.getSnapshot().has(user.id)).toBe(true);
    expect(cleaned).toEqual([]);
  });

  test('a throwing service reports failure instead of rejecting', async () => {
    const auth = createFixtureAuthService({ signedInAs: 'apple' });
    auth.deleteAccount = () => Promise.reject(new Error('boom'));
    const { actions } = setup(auth);
    expect(await actions.deleteAccount()).toEqual({ ok: false, reason: 'failed' });
  });

  test('sign-out unregisters the push token while still signed in', async () => {
    const auth = createFixtureAuthService({ signedInAs: 'apple' });
    const seen: string[] = [];
    const actions = createAccountActions({
      auth,
      onboarding: createOnboardingStore(memoryOnboardedStorage([user.id])),
      profiles: createProfileStore(createFixtureProfileService()),
      cleanups: createUserCleanups(),
      beforeSignOut: async () => {
        seen.push(auth.getState().status);
      },
    });
    await actions.signOut();
    expect(seen).toEqual(['signedIn']);
    expect(auth.getState().status).toBe('signedOut');
  });

  test('a failing unregistration never blocks sign-out', async () => {
    const auth = createFixtureAuthService({ signedInAs: 'apple' });
    const actions = createAccountActions({
      auth,
      onboarding: createOnboardingStore(memoryOnboardedStorage([user.id])),
      profiles: createProfileStore(createFixtureProfileService()),
      cleanups: createUserCleanups(),
      beforeSignOut: () => Promise.reject(new Error('offline')),
    });
    await actions.signOut();
    expect(auth.getState().status).toBe('signedOut');
  });

  test('a hung unregistration is capped at 3 s, and sign-out is busy until it ends', async () => {
    const auth = createFixtureAuthService({ signedInAs: 'apple' });
    const pending: { run: () => void; ms: number }[] = [];
    let seenWait = null as { expired: boolean } | null;
    const actions = createAccountActions({
      auth,
      onboarding: createOnboardingStore(memoryOnboardedStorage([user.id])),
      profiles: createProfileStore(createFixtureProfileService()),
      cleanups: createUserCleanups(),
      beforeSignOut: (wait) => {
        seenWait = wait;
        return new Promise<void>(() => {});
      },
      timers: {
        set: (run, ms) => pending.push({ run, ms }),
        clear: () => undefined,
      },
    });
    const signingOut = actions.signOut();
    expect(actions.signingOut.get()).toBe(true);
    await actions.signOut();
    expect(pending.map((timer) => timer.ms)).toEqual([SIGN_OUT_WAIT_MS]);
    expect(auth.getState().status).toBe('signedIn');
    expect(seenWait).toEqual({ expired: false });
    pending[0].run();
    expect(seenWait).toEqual({ expired: true });
    await signingOut;
    expect(auth.getState().status).toBe('signedOut');
    expect(actions.signingOut.get()).toBe(false);
  });
});
