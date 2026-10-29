import type { SupabaseClient } from '@supabase/supabase-js';

import { toLiveRows } from './parse';
import type { LiveBountyService } from './types';

export function createSupabaseLiveService(client: SupabaseClient | null): LiveBountyService {
  const db = () => {
    if (!client) throw new Error('Supabase is not configured');
    return client;
  };
  return {
    async list() {
      const { data, error } = await db().rpc('bounty_live_items');
      if (error) throw error;
      return toLiveRows(data);
    },
    async markSeen(bountyId, card) {
      try {
        const { error } = await db().rpc('mark_bounty_seen', { bounty: bountyId, card });
        return !error;
      } catch {
        return false;
      }
    },
  };
}
