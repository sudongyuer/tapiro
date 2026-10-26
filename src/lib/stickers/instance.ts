import { getSupabase } from '@/lib/supabase';
import { uiVerify, uiVerifyArgument } from '@/lib/uiVerify';

import { createFixtureStickerService, stickerFixture } from './fixture';
import { createSupabaseStickerService } from './service';
import { createStickerStore } from './store';

const fixture = uiVerify
  ? createFixtureStickerService(stickerFixture(uiVerifyArgument('uiVerifyStickers')))
  : null;

export const stickerStore = createStickerStore(
  fixture ?? createSupabaseStickerService(getSupabase()),
);

export const earnFixtureSticker = fixture?.earn;
