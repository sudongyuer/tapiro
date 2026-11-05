import { Settings } from 'react-native';

import { fixtureBlocked } from '@/features/block';
import { getSupabase } from '@/lib/supabase';
import { uiVerify, uiVerifyArgument } from '@/lib/uiVerify';
import { verifyRecorder } from '@/lib/verifyRecord';

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
  const recordLoad = verifyRecorder(LOADS_KEY);
  Settings.set({ [SELECTED_KEY]: '', [ATTEMPTS_KEY]: 0, [SEEN_KEY]: '' });
  return createFixtureSelectService({
    ...fixtureSelectOptions(uiVerifyArgument),
    writeDelayMs: Number(uiVerifyArgument('uiVerifySelectDelayMs')) || VERIFY_WRITE_DELAY_MS,
    isBlocked: fixtureBlocked,
    onSelected: (accepted) => Settings.set({ [SELECTED_KEY]: JSON.stringify(accepted) }),
    onAttempted: (attempts) => Settings.set({ [ATTEMPTS_KEY]: attempts }),
    onSeen: (seen) => Settings.set({ [SEEN_KEY]: JSON.stringify(seen) }),
    onLoaded: () => recordLoad('load'),
  });
}

const fixture = uiVerify ? verifySelectService() : null;

export const selectService: SelectService =
  fixture?.service ?? createSupabaseSelectService(getSupabase());

export const fixturePosterView = (id: string) => fixture?.posterView(id) ?? null;
