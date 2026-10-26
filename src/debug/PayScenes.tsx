import { useRouter } from 'expo-router';
import { useEffect } from 'react';

import { fixtureUser } from '@/features/account';
import { FIXTURE_PAYMENT_IDS, PaySheet } from '@/features/payment';
import { StickerBook } from '@/features/stickers';
import { uiVerifyArgument } from '@/lib/uiVerify';

export function PaySheetScene({ onReady }: { onReady: () => void }) {
  const router = useRouter();
  const paymentId = uiVerifyArgument('uiVerifyPayment') ?? FIXTURE_PAYMENT_IDS.owe;
  useEffect(onReady, [onReady]);
  return (
    <PaySheet
      userId={fixtureUser('apple').id}
      paymentId={paymentId}
      onClose={() => {}}
      onOpenStickerBook={() =>
        router.push({ pathname: '/debug/[scene]', params: { scene: 'sticker-book' } })
      }
    />
  );
}

export function StickerBookScene({ onReady }: { onReady: () => void }) {
  useEffect(onReady, [onReady]);
  return <StickerBook userId={fixtureUser('apple').id} />;
}
