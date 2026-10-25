import { initI18n } from '@/lib/i18n';
import { getSupabase } from '@/lib/supabase';
import { liveItems } from '@/lib/useLiveItems';
import { uiVerify, uiVerifyArgument, uiVerifyFixture } from '@/lib/uiVerify';

import { devicePay, fixturePay, readFileBytes } from './device';
import {
  createFixturePaymentService,
  PAY_METHOD_MIXES,
  type PayMethodMix,
} from './fixturePaymentService';
import { accessoryItems } from './livePayments';
import { createSupabasePaymentService } from './paymentService';
import { createPaymentStore } from './paymentStore';

const mixArgument = uiVerifyArgument('uiVerifyPayMethods');
const mix: PayMethodMix = PAY_METHOD_MIXES.find((value) => value === mixArgument) ?? 'all';

export const paymentStore = createPaymentStore(
  uiVerify
    ? createFixturePaymentService({
        variant: uiVerifyFixture,
        feed: uiVerifyArgument('uiVerifyShellFeed'),
        mix,
        settledBefore: uiVerifyArgument('uiVerifySettledBefore') === '1',
        rate: uiVerifyArgument('uiVerifyFx') !== 'none',
      })
    : createSupabasePaymentService(getSupabase(), readFileBytes),
);

export const payDevice = uiVerify ? fixturePay() : devicePay;

const i18n = initI18n();

function publish() {
  const state = paymentStore.getSnapshot();
  const payments = state.status === 'ready' ? state.payments : [];
  liveItems.setSource('payments', accessoryItems(payments, i18n.t));
}

paymentStore.subscribe(publish);
i18n.on('languageChanged', publish);
