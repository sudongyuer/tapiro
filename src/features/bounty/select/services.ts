import { Settings } from 'react-native';

import { fixtureBlocked } from '@/features/block/services';
import { getSupabase } from '@/lib/supabase';
import { uiVerify, uiVerifyArgument } from '@/lib/uiVerify';

import '../shared/blockFixturePeople';
import { createFixtureSelectService, fixtureSelectOptions } from './fixtureSelectService';
import { createSupabaseSelectService } from './selectService';
import type { SelectService } from './types';

const VERIFY_WRITE_DELAY_MS = 2500;
const SELECTED_KEY = 'uiVerifySelectedArgs';
const ATTEMPTS_KEY = 'uiVerifySelectAttempts';
const SEEN_KEY = 'uiVerifyNotSelectedSeen';
const LOADS_KEY = 'uiVerifyApplicantLoads';

function verifySelectService() {
  Settings.set({ [SELECTED_KEY]: '', [ATTEMPTS_KEY]: 0, [SEEN_KEY]: '', [LOADS_KEY]: 0 });
  return createFixtureSelectService({
    ...fixtureSelectOptions(uiVerifyArgument),
    writeDelayMs: Number(uiVerifyArgument('uiVerifySelectDelayMs')) || VERIFY_WRITE_DELAY_MS,
    isBlocked: fixtureBlocked,
    onSelected: (accepted) => Settings.set({ [SELECTED_KEY]: JSON.stringify(accepted) }),
    onAttempted: (attempts) => Settings.set({ [ATTEMPTS_KEY]: attempts }),
    onSeen: (seen) => Settings.set({ [SEEN_KEY]: JSON.stringify(seen) }),
    onLoaded: (loads) => Settings.set({ [LOADS_KEY]: loads }),
  });
}

const fixture = uiVerify ? verifySelectService() : null;

export const selectService: SelectService =
  fixture?.service ?? createSupabaseSelectService(getSupabase());

export const fixturePosterView = (id: string) => fixture?.posterView(id) ?? null;
