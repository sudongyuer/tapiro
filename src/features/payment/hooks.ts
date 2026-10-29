import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { CURRENCY_CODES, type CurrencyCode } from '@/lib/money';
import type { PayeeMethod } from '@/lib/payeeMethods';

import { paymentStore } from './services';
import type { FxRate, Payment, PaymentService, SettleResult } from './types';

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

export type SheetData = { payment: Payment; methods: PayeeMethod[]; rate: FxRate | null };

export type SheetState =
  | { status: 'loading' }
  | { status: 'failed' }
  | { status: 'missing' }
  | ({ status: 'ready' } & SheetData);

export type SheetAction = 'markPaid' | 'undo' | 'confirm' | 'notReceived';

function rateFor(service: PaymentService, currency: CurrencyCode) {
  const other = CURRENCY_CODES.find((code) => code !== currency);
  return other ? service.latestRate(currency, other).catch(() => null) : Promise.resolve(null);
}

async function loadSheet(userId: string, paymentId: string): Promise<SheetState> {
  const { service } = paymentStore;
  const payment = await service.get(userId, paymentId);
  if (!payment) return { status: 'missing' };
  const owner = payment.role === 'payer' ? payment.counterpartId : userId;
  const [methods, rate] = await Promise.all([
    owner && payment.state !== 'settled' ? service.methodsOf(owner) : Promise.resolve([]),
    rateFor(service, payment.amount.currency),
  ]);
  return { status: 'ready', payment, methods, rate };
}

export function usePaySheet(userId: string, paymentId: string) {
  const [state, setState] = useState<SheetState>({ status: 'loading' });
  const [version, setVersion] = useState(0);
  const [busy, setBusy] = useState<SheetAction | null>(null);
  const [failed, setFailed] = useState(false);
  const busyRef = useRef(false);

  useEffect(() => {
    let live = true;
    loadSheet(userId, paymentId).then(
      (next) => live && setState(next),
      () =>
        live &&
        setState((current) => (current.status === 'ready' ? current : { status: 'failed' })),
    );
    return () => {
      live = false;
    };
  }, [userId, paymentId, version]);

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setVersion((current) => current + 1);
  }, []);

  async function act<T>(action: SheetAction, run: () => Promise<T>): Promise<T | null> {
    if (busyRef.current) return null;
    busyRef.current = true;
    setBusy(action);
    setFailed(false);
    const result = await paymentStore.run(userId, run);
    if (!result.ok) setFailed(true);
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
    markPaid: (methodId: string, proofPath: string | null) =>
      act('markPaid', () => service.markPaid(paymentId, methodId, proofPath)),
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
