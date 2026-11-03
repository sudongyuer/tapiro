import { Settings } from 'react-native';

import { getSupabase } from '@/lib/supabase';
import { uiVerify, uiVerifyArgument } from '@/lib/uiVerify';

import { createLive } from './live';
import { createSupabaseTransport } from './supabaseTransport';
import { createVerifyTransport, parseLiveScript } from './verifyTransport';

const DELIVERED_KEY = 'uiVerifyLiveSteps';

function verifyTransport() {
  Settings.set({ [DELIVERED_KEY]: '[]' });
  return createVerifyTransport(parseLiveScript(uiVerifyArgument('uiVerifyLive')), {
    onDelivered: (labels) => Settings.set({ [DELIVERED_KEY]: JSON.stringify(labels) }),
  });
}

export const live = createLive({
  transport: uiVerify ? verifyTransport() : createSupabaseTransport(getSupabase()),
});
