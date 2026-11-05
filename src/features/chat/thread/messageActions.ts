import * as Clipboard from 'expo-clipboard';
import type { TFunction } from 'i18next';
import { Alert } from 'react-native';

import { chatStore } from '../services';
import type { PendingMessage } from '../types';
import { canRetry } from './threadView';

export function copyMessage(body: string) {
  void Clipboard.setStringAsync(body);
}

export function askResend(pending: PendingMessage, t: TFunction) {
  const discard = {
    text: t('chat.thread.discard'),
    style: 'destructive' as const,
    onPress: () => chatStore.discard(pending.clientId),
  };
  const cancel = { text: t('chat.thread.cancel'), style: 'cancel' as const };
  if (!canRetry(pending.failure)) {
    Alert.alert(t('chat.thread.undeliverableTitle'), undefined, [discard, cancel]);
    return;
  }
  Alert.alert(t('chat.thread.resendTitle'), undefined, [
    { text: t('chat.thread.resend'), onPress: () => chatStore.retry(pending.clientId) },
    discard,
    cancel,
  ]);
}
