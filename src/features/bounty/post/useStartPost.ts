import { Alert } from 'react-native';

import { useI18n } from '@/lib/i18n';

import { blockedReason, ringgit } from './blockedReason';
import { postService } from './services';
import { createStartPost } from './startPost';
import type { PostStatus } from './types';

export function useStartPost({
  open,
  pay,
}: {
  open: () => void;
  pay: (paymentId: string) => void;
}) {
  const { t, language } = useI18n();

  function hint(status: PostStatus) {
    const reason = blockedReason(status.unpaid, new Date());
    if (!reason) return;
    const body =
      reason.kind === 'many'
        ? t('bounty.post.hint.many', {
            count: reason.unpaid.length,
            total: ringgit(reason.totalSen, language),
          })
        : t('bounty.post.hint.old', {
            name: reason.payment.payeeName,
            amount: ringgit(reason.payment.amountSen, language),
            days: reason.days,
          });
    const oldest = reason.kind === 'many' ? reason.unpaid[0] : reason.payment;
    Alert.alert(t('bounty.post.hint.title'), body, [
      { text: t('bounty.post.hint.later'), style: 'cancel' },
      { text: t('bounty.post.hint.pay'), onPress: () => pay(oldest.paymentId) },
    ]);
  }

  return () => createStartPost({ status: () => postService.status(), open, hint })();
}
