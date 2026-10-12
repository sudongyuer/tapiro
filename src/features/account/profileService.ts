import type { SupabaseClient } from '@supabase/supabase-js';

import { DISPLAY_NAME_MAX, PLACEHOLDER_DISPLAY_NAME } from './displayName';
import type { AccountUser } from './types';

export type Profile = { displayName: string; avatarUrl: string | null };

export type ProfileService = {
  load(user: AccountUser): Promise<Profile | null>;
  save(user: AccountUser, profile: Profile): Promise<boolean>;
  forget(userId: string): void;
};

type ProfileRow = { display_name: string; avatar_url: string | null };

const toProfile = (row: ProfileRow): Profile => ({
  displayName: row.display_name,
  avatarUrl: row.avatar_url,
});

export function createSupabaseProfileService(client: SupabaseClient | null): ProfileService {
  return {
    async load(user) {
      if (!client) return null;
      const { data, error } = await client
        .from('profiles')
        .select('display_name, avatar_url')
        .eq('id', user.id)
        .maybeSingle<ProfileRow>();
      if (error) throw error;
      return data ? toProfile(data) : null;
    },

    async save(user, profile) {
      if (!client) return false;
      const values = { display_name: profile.displayName, avatar_url: profile.avatarUrl };
      const updated = await client.from('profiles').update(values).eq('id', user.id).select('id');
      if (updated.error) return false;
      if (updated.data.length > 0) return true;
      const inserted = await client.from('profiles').insert({ id: user.id, ...values });
      return !inserted.error;
    },

    forget() {},
  };
}

export function createFixtureProfileService(): ProfileService {
  const rows = new Map<string, Profile>();
  return {
    async load(user) {
      const existing = rows.get(user.id);
      if (existing) return existing;
      const created = {
        displayName: (user.name ?? PLACEHOLDER_DISPLAY_NAME).slice(0, DISPLAY_NAME_MAX),
        avatarUrl: user.avatarUrl,
      };
      rows.set(user.id, created);
      return created;
    },
    async save(user, profile) {
      rows.set(user.id, profile);
      return true;
    },
    forget(userId) {
      rows.delete(userId);
    },
  };
}
