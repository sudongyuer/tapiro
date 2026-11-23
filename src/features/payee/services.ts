import { live } from '@/lib/live';
import { sessionEnds } from '@/lib/sessionEnds';
import { getSupabase } from '@/lib/supabase';
import { uiVerify, uiVerifyArgument, uiVerifyFixture } from '@/lib/uiVerify';

import { createFixturePayeeService } from './fixturePayeeService';
import { createSupabasePayeeService } from './payeeService';
import type { PayeeService } from './payeeService';
import { createPayeeStore } from './payeeStore';
import { deviceQrSource, fixtureQrSource } from './qrSource';

function failingRefreshes(service: PayeeService): PayeeService {
  let lists = 0;
  return {
    ...service,
    async list() {
      lists += 1;
      if (lists > 1) throw new Error('offline');
      return service.list();
    },
  };
}

function verifyPayeeService() {
  const service = createFixturePayeeService(uiVerifyFixture, {
    reported: uiVerifyArgument('uiVerifyPayeeReported') === '1',
  });
  return uiVerifyArgument('uiVerifyPayeeFail') === 'refresh' ? failingRefreshes(service) : service;
}

export const payeeStore = createPayeeStore(
  uiVerify ? verifyPayeeService() : createSupabasePayeeService(getSupabase()),
);

const fixtureScans = uiVerifyArgument('uiVerifyQr');

export const qrSource = fixtureScans ? fixtureQrSource(fixtureScans) : deviceQrSource;

live.on(['payment.cant_pay'], () => {
  const state = payeeStore.getSnapshot();
  if (state.status !== 'idle') void payeeStore.refresh(state.userId);
});

sessionEnds.register(() => payeeStore.clear());
