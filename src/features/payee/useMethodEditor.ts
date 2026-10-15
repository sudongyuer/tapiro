import { useState } from 'react';

import { createInFlightGuard } from '@/lib/inFlightGuard';

import { usePayeeMethods } from './hooks';
import type { PayeeDetails } from './methods';
import { payeeStore } from './services';

export function useMethodEditor(userId: string, methodId: string | undefined, onDone: () => void) {
  const { methods } = usePayeeMethods(userId);
  const [guard] = useState(createInFlightGuard);
  const [saveFailed, setSaveFailed] = useState(false);
  const existing = methodId ? (methods.find((method) => method.id === methodId) ?? null) : null;

  const run = (change: () => Promise<boolean>) =>
    guard(async () => {
      setSaveFailed(false);
      if (await change()) onDone();
      else setSaveFailed(true);
    });

  return {
    methods,
    existing,
    saveFailed,
    clearSaveFailed: () => setSaveFailed(false),
    save: (details: PayeeDetails) =>
      run(() =>
        existing
          ? payeeStore.update(userId, existing.id, details)
          : payeeStore.add(userId, details),
      ),
    update: (id: string, details: PayeeDetails) =>
      run(() => payeeStore.update(userId, id, details)),
    makeDefault: () => existing && run(() => payeeStore.setDefault(userId, existing.id)),
    remove: () => existing && run(() => payeeStore.remove(userId, existing.id)),
  };
}
