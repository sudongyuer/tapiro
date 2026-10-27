import { describe, expect, test } from 'bun:test';

import { createUserCleanups } from '@/lib/userCleanups';

import { createAccountActions } from './accountActions';
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
});
