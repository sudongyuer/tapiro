import { useState } from 'react';
import { Alert } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { createInFlightGuard } from '@/lib/inFlightGuard';

import { usePayeeMethods } from './hooks';
import { canUpdateInPlace, type PayeeDetails, type PayeeMethod } from './methods';
import { payeeStore } from './services';

export function useMethodEditor(userId: string, methodId: string | undefined, onDone: () => void) {
  const { t } = useI18n();
  const { status, methods } = usePayeeMethods(userId);
  const [guard] = useState(createInFlightGuard);
  const [saveFailed, setSaveFailed] = useState(false);
  const existing = methodId ? (methods.find((method) => method.id === methodId) ?? null) : null;

  const run = (change: () => Promise<boolean>) =>
    guard(async () => {
      setSaveFailed(false);
      if (await change()) onDone();
      else setSaveFailed(true);
    });

  const write = (target: PayeeMethod | null, details: PayeeDetails) =>
    run(() => {
      if (!target) return payeeStore.add(userId, details);
      if (canUpdateInPlace(target, details)) return payeeStore.update(userId, target.id, details);
      return payeeStore.replaceQr(userId, target.id, details);
    });

  function remove() {
    if (!existing) return;
    Alert.alert(t('payee.deleteConfirm.title'), t('payee.deleteConfirm.body'), [
      { text: t('payee.cancel'), style: 'cancel' },
      {
        text: t('payee.delete'),
        style: 'destructive',
        onPress: () => run(() => payeeStore.remove(userId, existing.id)),
      },
    ]);
  }

  return {
    methods,
    existing,
    pending: methodId && status !== 'ready' ? status : null,
    retry: () => payeeStore.ensureLoaded(userId),
    saveFailed,
    clearSaveFailed: () => setSaveFailed(false),
    save: (details: PayeeDetails) => write(existing, details),
    write,
    makeDefault: () => existing && run(() => payeeStore.setDefault(userId, existing.id)),
    remove,
  };
}
