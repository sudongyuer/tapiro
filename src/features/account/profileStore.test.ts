import { describe, expect, test } from 'bun:test';

import { fixtureUser } from './fixtureAuthService';
import type { ProfileService } from './profileService';
import { createProfileStore } from './profileStore';

const user = fixtureUser('google');

function service(overrides: Partial<ProfileService>): ProfileService {
  return {
    load: async () => ({ displayName: 'Lim', avatarUrl: null }),
    save: async () => true,
    forget: () => {},
    ...overrides,
  };
}

describe('profile store', () => {
  test('loads once per user', async () => {
    let loads = 0;
    const store = createProfileStore(
      service({
        load: async () => {
          loads++;
          return { displayName: 'Lim', avatarUrl: null };
        },
      }),
    );
    await store.ensureLoaded(user);
    await store.ensureLoaded(user);
    expect(loads).toBe(1);
    expect(store.getSnapshot()).toMatchObject({ status: 'ready', userId: user.id });
  });

  test('a failed load is retried on the next request', async () => {
    let fail = true;
    const store = createProfileStore(
      service({
        load: async () => {
          if (fail) throw new Error('offline');
          return null;
        },
      }),
    );
    await store.ensureLoaded(user);
    expect(store.getSnapshot()).toEqual({ status: 'failed', userId: user.id });
    fail = false;
    await store.ensureLoaded(user);
    expect(store.getSnapshot()).toEqual({ status: 'ready', userId: user.id, profile: null });
  });

  test('a failed or throwing save keeps the previous profile', async () => {
    const store = createProfileStore(service({ save: () => Promise.reject(new Error('offline')) }));
    await store.ensureLoaded(user);
    expect(await store.save(user, { displayName: 'New', avatarUrl: null })).toBe(false);
    expect(store.getSnapshot()).toMatchObject({ profile: { displayName: 'Lim' } });
  });
});
