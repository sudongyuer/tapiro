import type { SupabaseClient } from '@supabase/supabase-js';

import type { BlockService, BlockedPerson } from './types';

type BlockRow = { blocked_id: string };
type ProfileRow = { id: string; display_name: string };

function isGone(error: { message?: string; code?: string }) {
  return error.message === 'user_not_found' || error.code === 'P0002';
}

export function createSupabaseBlockService(client: SupabaseClient | null): BlockService {
  const db = () => {
    if (!client) throw new Error('Supabase is not configured');
    return client;
  };

  return {
    async block(target) {
      const { error } = await db().rpc('block_user', { target });
      if (!error) return 'blocked';
      if (isGone(error)) return 'gone';
      throw error;
    },
    async unblock(target) {
      const { error } = await db().rpc('unblock_user', { target });
      if (error) throw error;
    },
    async list(): Promise<BlockedPerson[]> {
      const blocks = await db()
        .from('blocks')
        .select('blocked_id')
        .order('created_at', { ascending: false })
        .returns<BlockRow[]>();
      if (blocks.error) throw blocks.error;
      const ids = (blocks.data ?? []).map((row) => row.blocked_id);
      if (ids.length === 0) return [];
      const profiles = await db()
        .from('profiles')
        .select('id, display_name')
        .in('id', ids)
        .returns<ProfileRow[]>();
      if (profiles.error) throw profiles.error;
      const names = new Map((profiles.data ?? []).map((row) => [row.id, row.display_name]));
      return ids.map((id) => ({ id, name: names.get(id) ?? null }));
    },
  };
}
