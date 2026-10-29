import type { SupabaseClient } from '@supabase/supabase-js';

import {
  newestFirst,
  STICKER_KINDS,
  STICKER_ROLES,
  type Sticker,
  type StickerService,
} from './model';
import { body, oneOf, rows, text, textOrNull } from './parse';

export function toSticker(value: unknown): Sticker {
  const row = body(value, 'sticker');
  return {
    id: text(row.id, 'id'),
    paymentId: text(row.paymentId, 'paymentId'),
    role: oneOf(STICKER_ROLES, row.role, 'role'),
    itemKind: oneOf(STICKER_KINDS, row.itemKind, 'itemKind'),
    category: textOrNull(row.category, 'category'),
    title: text(row.title, 'title'),
    earnedAt: text(row.earnedAt, 'earnedAt'),
    counterpartName: textOrNull(row.counterpartName, 'counterpartName'),
  };
}

export function createSupabaseStickerService(client: SupabaseClient | null): StickerService {
  return {
    async list() {
      if (!client) throw new Error('Supabase is not configured');
      const { data, error } = await client.rpc('sticker_book');
      if (error) throw error;
      return newestFirst(rows(data, 'sticker book', toSticker));
    },
  };
}
