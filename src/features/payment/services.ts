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
    ? createFixturePaymentService(
        {
          variant: uiVerifyFixture,
          feed: uiVerifyArgument('uiVerifyShellFeed'),
          mix,
          settledBefore: uiVerifyArgument('uiVerifySettledBefore') === '1',
          rate: uiVerifyArgument('uiVerifyFx') !== 'none',
          failFirstLoad: uiVerifyArgument('uiVerifyPaymentsFail') === '1',
        },
        () => fixturePay().qrImage('Tapiro fixture payment screenshot', 240),
      )
    : createSupabasePaymentService(getSupabase(), readFileBytes),
);

export const payDevice = uiVerify ? fixturePay() : devicePay;

const i18n = initI18n();

function retry() {
  const state = paymentStore.getSnapshot();
  if (state.status !== 'idle') paymentStore.ensureLoaded(state.userId);
}

function publish() {
  const state = paymentStore.getSnapshot();
  if (state.status === 'idle') return liveItems.setSource('payments', [], 'ready');
  liveItems.setSource('payments', accessoryItems(state.payments, i18n.t), state.status, retry);
}

paymentStore.subscribe(publish);
i18n.on('languageChanged', publish);
