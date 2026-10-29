import { useEffect } from 'react';
import { Alert } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { formatMoney } from '@/lib/money';

import { blockedReason } from './blockedReason';
import { postService } from './services';
import { createHintGate, createStartPost } from './startPost';
import type { PostStatus } from './types';

export const hintGate = createHintGate();

export function useHintFocus(focused: boolean) {
  useEffect(() => {
    if (focused) hintGate.formFocused();
    else hintGate.formBlurred();
  }, [focused]);
  useEffect(() => () => hintGate.formBlurred(), []);
}

export function useStartPost({
  open,
  pay,
}: {
  open: () => void;
  pay: (paymentId: string) => void;
}) {
  const { t, language } = useI18n();

  function hint(status: PostStatus) {
    const reason = blockedReason(status.unpaid, new Date(), t('bounty.post.unknownName'));
    if (!reason) return;
    const body =
      reason.kind === 'many'
        ? t('bounty.post.hint.many', {
            count: reason.unpaid.length,
            total: reason.totals
              .map((total) => formatMoney(total, language, { whole: true }))
              .join(t('bounty.post.blocked.separator')),
          })
        : t('bounty.post.hint.old', {
            name: reason.payment.payeeName,
            amount: formatMoney(reason.payment.amount, language, { whole: true }),
            days: reason.days,
          });
    const oldest = reason.kind === 'many' ? reason.unpaid[0] : reason.payment;
    Alert.alert(t('bounty.post.hint.title'), body, [
      { text: t('bounty.post.hint.later'), style: 'cancel' },
      { text: t('bounty.post.hint.pay'), onPress: () => pay(oldest.paymentId) },
    ]);
  }

  useEffect(() => {
    hintGate.setPresenter(hint);
  });

  return () => createStartPost({ status: () => postService.status(), open, gate: hintGate })();
}
