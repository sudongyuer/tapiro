import { useEffect } from 'react';

import { fixtureUser } from '@/features/account';
import { FIXTURE_PAYMENT_IDS, PaySheet } from '@/features/payment';
import { uiVerifyArgument } from '@/lib/uiVerify';

export function PaySheetScene({ onReady }: { onReady: () => void }) {
  const paymentId = uiVerifyArgument('uiVerifyPayment') ?? FIXTURE_PAYMENT_IDS.owe;
  useEffect(onReady, [onReady]);
  return <PaySheet userId={fixtureUser('apple').id} paymentId={paymentId} onClose={() => {}} />;
}
