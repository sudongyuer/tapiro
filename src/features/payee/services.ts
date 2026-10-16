import { getSupabase } from '@/lib/supabase';
import { uiVerify, uiVerifyArgument, uiVerifyFixture } from '@/lib/uiVerify';

import { createFixturePayeeService } from './fixturePayeeService';
import { createSupabasePayeeService } from './payeeService';
import { createPayeeStore } from './payeeStore';
import { deviceQrSource, fixtureQrSource } from './qrSource';

export const payeeStore = createPayeeStore(
  uiVerify ? createFixturePayeeService(uiVerifyFixture) : createSupabasePayeeService(getSupabase()),
);

const fixtureScans = uiVerifyArgument('uiVerifyQr');

export const qrSource = fixtureScans ? fixtureQrSource(fixtureScans) : deviceQrSource;
