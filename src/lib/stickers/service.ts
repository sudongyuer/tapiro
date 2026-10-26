import type { SupabaseClient } from '@supabase/supabase-js';

import { newestFirst, type Sticker, type StickerKind, type StickerService } from './model';

type StickerRow = {
  id: string;
  payment_id: string;
  item_kind: StickerKind;
  category: string | null;
  title: string;
  earned_at: string;
};

export function toSticker(row: StickerRow): Sticker {
  return {
    id: row.id,
    paymentId: row.payment_id,
    itemKind: row.item_kind,
    category: row.category,
    title: row.title,
    earnedAt: row.earned_at,
  };
}

export function createSupabaseStickerService(client: SupabaseClient | null): StickerService {
  return {
    async list(userId) {
      if (!client) throw new Error('Supabase is not configured');
      const { data, error } = await client
        .from('stickers')
        .select('id, payment_id, item_kind, category, title, earned_at')
        .eq('owner_id', userId)
        .order('earned_at', { ascending: false })
        .returns<StickerRow[]>();
      if (error) throw error;
      return newestFirst((data ?? []).map(toSticker));
    },
  };
}
