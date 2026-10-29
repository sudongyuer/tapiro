import { Settings } from 'react-native';

import { getSupabase } from '@/lib/supabase';
import { uiVerify, uiVerifyArgument } from '@/lib/uiVerify';

import { createFixtureStatusService, fixtureStatusOptions } from './fixtureStatusService';
import { createSupabaseStatusService } from './statusService';
import type { StatusService } from './types';

const VERIFY_WRITE_DELAY_MS = 1500;
const CALLS_KEY = 'uiVerifyBountyStatusCalls';

function verifyStatusService() {
  Settings.set({ [CALLS_KEY]: '' });
  return createFixtureStatusService({
    ...fixtureStatusOptions(uiVerifyArgument),
    writeDelayMs: Number(uiVerifyArgument('uiVerifyBountyStatusDelayMs')) || VERIFY_WRITE_DELAY_MS,
    onCalled: (calls) => Settings.set({ [CALLS_KEY]: JSON.stringify(calls) }),
  });
}

export const statusFixture = uiVerify ? verifyStatusService() : null;

export const statusService: StatusService =
  statusFixture?.service ?? createSupabaseStatusService(getSupabase());
