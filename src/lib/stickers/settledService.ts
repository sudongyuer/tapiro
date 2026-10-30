import type { SupabaseClient } from '@supabase/supabase-js';

import { toSettledRows, type SettledService } from './settled';

export function createSupabaseSettledService(client: SupabaseClient | null): SettledService {
  const db = () => {
    if (!client) throw new Error('Supabase is not configured');
    return client;
  };
  return {
    async list() {
      const { data, error } = await db().rpc('settled_cards');
      if (error) throw error;
      return toSettledRows(data);
    },
    async collect(stickerId) {
      try {
        const { error } = await db().rpc('collect_sticker', { sticker: stickerId });
        if (!error) return 'collected';
        return error.message === 'sticker_not_found' || error.code === 'P0002'
          ? 'notFound'
          : 'failed';
      } catch {
        return 'failed';
      }
    },
  };
}
