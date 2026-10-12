import type { User } from '@supabase/supabase-js';

import { AUTH_PROVIDERS, type AccountUser, type AuthProvider } from './types';

function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : null;
}

function asProvider(value: unknown): AuthProvider | null {
  return AUTH_PROVIDERS.find((provider) => provider === value) ?? null;
}

export function toAccountUser(user: User): AccountUser {
  const meta: Record<string, unknown> = user.user_metadata ?? {};
  return {
    id: user.id,
    email: text(user.email),
    name: text(meta.full_name) ?? text(meta.name),
    avatarUrl: text(meta.avatar_url) ?? text(meta.picture),
    provider: asProvider(user.app_metadata?.provider),
  };
}
