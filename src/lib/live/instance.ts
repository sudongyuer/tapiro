import { getSupabase } from '@/lib/supabase';
import { uiVerify, uiVerifyArgument } from '@/lib/uiVerify';
import { verifyRecorder } from '@/lib/verifyRecord';

import { createLive } from './live';
import { createSupabaseTransport } from './supabaseTransport';
import { createVerifyTransport, parseLiveScript } from './verifyTransport';

function verifyTransport() {
  return createVerifyTransport(parseLiveScript(uiVerifyArgument('uiVerifyLive')), {
    onDelivered: verifyRecorder('uiVerifyLiveSteps'),
  });
}

export const live = createLive({
  transport: uiVerify ? verifyTransport() : createSupabaseTransport(getSupabase()),
});
