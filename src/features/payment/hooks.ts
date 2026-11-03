import { useIsFocused } from 'expo-router';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { useLiveSignal } from '@/lib/live';

import { paymentStore } from './services';
import { answeredSheet, failedSheet, type SheetAnswer, type SheetState } from './sheetLoad';
import { sheetFailure, type SheetFailure } from './stateMachine';
import type { SettleResult } from './types';

export type { SheetData, SheetState } from './sheetLoad';

export function useLivePayments(userId: string | null) {
  useEffect(() => {
    if (!userId) {
      paymentStore.clear();
      return;
    }
    paymentStore.ensureLoaded(userId);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') paymentStore.reload(userId);
    });
    return () => subscription.remove();
  }, [userId]);
}

export function usePaymentList() {
  return useSyncExternalStore(paymentStore.subscribe, paymentStore.getSnapshot);
}

export type SheetAction = 'markPaid' | 'undo' | 'confirm' | 'notReceived';

async function loadSheet(userId: string, paymentId: string): Promise<SheetAnswer> {
  const { service } = paymentStore;
  const payment = await service.get(userId, paymentId);
  if (!payment) return { status: 'missing' };
  const owner = payment.role === 'payer' ? payment.counterpartId : userId;
  const [methods, detail] = await Promise.all([
    owner && payment.state !== 'settled' ? service.methodsOf(owner) : Promise.resolve([]),
    service.detail(paymentId),
  ]);
  return { status: 'ready', payment, methods, detail };
}

export function usePaySheet(userId: string, paymentId: string) {
  const [state, setState] = useState<SheetState>({ status: 'loading' });
  const [version, setVersion] = useState(0);
  const [busy, setBusy] = useState<SheetAction | null>(null);
  const [failed, setFailed] = useState<SheetFailure | null>(null);
  const busyRef = useRef(false);

  useEffect(() => {
    let live = true;
    loadSheet(userId, paymentId).then(
      (next) => live && setState(answeredSheet(next, Date.now())),
      () => live && setState(failedSheet),
    );
    return () => {
      live = false;
    };
  }, [userId, paymentId, version]);

  const focused = useIsFocused();
  useLiveSignal(
    ['payment.'],
    (signal) => {
      if (!signal || signal.id === paymentId) setVersion((current) => current + 1);
    },
    focused,
  );

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setVersion((current) => current + 1);
  }, []);

  async function act<T>(action: SheetAction, run: () => Promise<T>): Promise<T | null> {
    if (busyRef.current) return null;
    busyRef.current = true;
    setBusy(action);
    setFailed(null);
    const result = await paymentStore.run(userId, run);
    if (!result.ok) setFailed(sheetFailure(result.error));
    setVersion((current) => current + 1);
    busyRef.current = false;
    setBusy(null);
    return result.ok ? result.value : null;
  }

  const { service } = paymentStore;
  const proofUrl = useCallback((path: string) => service.proofUrl(path), [service]);
  return {
    state,
    busy,
    failed,
    retry,
    markPaid: (methodId: string, proofPath: string | null, expectedMinor: number) =>
      act('markPaid', () => service.markPaid(paymentId, methodId, proofPath, expectedMinor)),
    undo: () =>
      act('undo', async () => {
        const detached = state.status === 'ready' ? state.payment.proofPath : null;
        await service.undo(paymentId);
        if (detached) await service.removeProof(detached).catch(() => undefined);
      }),
    proofUrl,
    confirm: (): Promise<SettleResult | null> => act('confirm', () => service.confirm(paymentId)),
    notReceived: () => act('notReceived', () => service.notReceived(paymentId)),
    uploadProof: (fileUri: string) => service.uploadProof(paymentId, fileUri),
  };
}
