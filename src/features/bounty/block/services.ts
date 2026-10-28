import { getSupabase } from '@/lib/supabase';
import { uiVerify } from '@/lib/uiVerify';

import { FIXTURE_BOARDS } from '../board/fixtureBoardData';
import { createSupabaseBlockService } from './blockService';
import { createFixtureBlockService } from './fixtureBlockService';
import type { BlockService } from './types';

const VERIFY_WRITE_DELAY_MS = 2500;

const fixturePeople = () => {
  const people = new Map<string, string | null>();
  for (const board of Object.values(FIXTURE_BOARDS)) {
    for (const item of board) people.set(item.poster.id, item.poster.name);
  }
  return [...people].map(([id, name]) => ({ id, name }));
};

const fixture = uiVerify
  ? createFixtureBlockService({ people: fixturePeople(), writeDelayMs: VERIFY_WRITE_DELAY_MS })
  : null;

export const blockService: BlockService =
  fixture?.service ?? createSupabaseBlockService(getSupabase());

export const fixtureBlocked = (id: string) => fixture?.isBlocked(id) ?? false;
