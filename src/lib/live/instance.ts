import { Settings } from 'react-native';

import { getSupabase } from '@/lib/supabase';
import { uiVerify, uiVerifyArgument } from '@/lib/uiVerify';

import { createLive } from './live';
import { createSupabaseTransport } from './supabaseTransport';
import { createVerifyTransport, parseLiveScript } from './verifyTransport';

const DELIVERED_KEY = 'uiVerifyLiveSteps';

function verifyTransport() {
  const run = uiVerifyArgument('uiVerifyLiveRun') ?? '';
  const record = (steps: string[]) =>
    Settings.set({ [DELIVERED_KEY]: JSON.stringify({ run, steps }) });
  record([]);
  return createVerifyTransport(parseLiveScript(uiVerifyArgument('uiVerifyLive')), {
    onDelivered: record,
  });
}

export const live = createLive({
  transport: uiVerify ? verifyTransport() : createSupabaseTransport(getSupabase()),
});
