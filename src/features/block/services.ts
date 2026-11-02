import { getSupabase } from '@/lib/supabase';
import { uiVerify, uiVerifyArgument } from '@/lib/uiVerify';

import { createSupabaseBlockService } from './blockService';
import { createFixtureBlockService } from './fixtureBlockService';
import type { BlockService, BlockedPerson } from './types';

const VERIFY_WRITE_DELAY_MS = 2500;

const fixturePeople: BlockedPerson[] = [];

export function addBlockFixturePeople(people: readonly BlockedPerson[]) {
  for (const person of people) {
    if (!fixturePeople.some((known) => known.id === person.id)) fixturePeople.push(person);
  }
}

const fixture = uiVerify
  ? createFixtureBlockService({
      people: fixturePeople,
      writeDelayMs: Number(uiVerifyArgument('uiVerifyBlockDelayMs')) || VERIFY_WRITE_DELAY_MS,
      failOnce: uiVerifyArgument('uiVerifyBlock') === 'failOnce',
    })
  : null;

export const blockService: BlockService =
  fixture?.service ?? createSupabaseBlockService(getSupabase());

export const fixtureBlocked = (id: string) => fixture?.isBlocked(id) ?? false;
