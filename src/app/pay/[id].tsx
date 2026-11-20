import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useRef } from 'react';

import { useSignedInUser } from '@/features/account';
import { chatDrafts, useItemChat } from '@/features/chat';
import { PaySheet } from '@/features/payment';
import { useI18n } from '@/lib/i18n';

export default function PayRoute() {
  const router = useRouter();
  const { t } = useI18n();
  const user = useSignedInUser();
  const userId = user?.id ?? null;
  const { id } = useLocalSearchParams<{ id: string }>();
  const draft = useRef('');
  const chat = useItemChat(
    useCallback(
      (thread: string) => {
        if (userId) chatDrafts.prefill(userId, thread, draft.current);
        router.back();
        router.navigate({ pathname: '/messages/[thread]', params: { thread } });
      },
      [router, userId],
    ),
  );
  if (!user || !id) return null;
  return (
    <PaySheet
      userId={user.id}
      paymentId={id}
      onClose={() => router.back()}
      onOpenStickerBook={() => {
        router.back();
        router.navigate('/me/stickers');
      }}
      remind={{
        onPress: (payment) => {
          draft.current = t('pay.sheet.none.draft', { title: payment.title });
          chat.open(payment.itemKind, payment.itemId);
        },
        busy: chat.opening !== null,
      }}
    />
  );
}
