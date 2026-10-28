import { Settings } from 'react-native';

import { getSupabase } from '@/lib/supabase';
import { uiVerify, uiVerifyArgument } from '@/lib/uiVerify';

import { fixtureBlocked } from '../block/services';
import { createFixtureSelectService, fixtureSelectOptions } from './fixtureSelectService';
import { createSupabaseSelectService } from './selectService';
import type { SelectService } from './types';

const VERIFY_WRITE_DELAY_MS = 2500;
const SELECTED_KEY = 'uiVerifySelectedArgs';
const ATTEMPTS_KEY = 'uiVerifySelectAttempts';

function verifySelectService() {
  Settings.set({ [SELECTED_KEY]: '', [ATTEMPTS_KEY]: 0 });
  return createFixtureSelectService({
    ...fixtureSelectOptions(uiVerifyArgument),
    writeDelayMs: VERIFY_WRITE_DELAY_MS,
    isBlocked: fixtureBlocked,
    onSelected: (accepted) => Settings.set({ [SELECTED_KEY]: JSON.stringify(accepted) }),
    onAttempted: (attempts) => Settings.set({ [ATTEMPTS_KEY]: attempts }),
  });
}

const fixture = uiVerify ? verifySelectService() : null;

export const selectService: SelectService =
  fixture?.service ?? createSupabaseSelectService(getSupabase());

export const fixturePosterView = (id: string) => fixture?.posterView(id) ?? null;
