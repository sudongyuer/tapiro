import { getSupabase } from '@/lib/supabase';
import { uiVerify, uiVerifyArgument } from '@/lib/uiVerify';

import { createLive } from './live';
import { createSupabaseTransport } from './supabaseTransport';
import { createVerifyTransport, parseLiveScript } from './verifyTransport';

export const live = createLive({
  transport: uiVerify
    ? createVerifyTransport(parseLiveScript(uiVerifyArgument('uiVerifyLive')))
    : createSupabaseTransport(getSupabase()),
});
