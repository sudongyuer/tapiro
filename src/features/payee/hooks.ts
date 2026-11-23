import { useEffect, useSyncExternalStore } from 'react';

import { payeeAttention, type PayeeMethod } from './methods';
import { payeeStore } from './services';

const NONE: PayeeMethod[] = [];

export type PayeeMethodsView =
  | { status: 'loading' | 'failed'; methods: PayeeMethod[]; staleSince: null }
  | { status: 'ready'; methods: PayeeMethod[]; staleSince: number | null };

export function usePayeeMethods(userId: string | null): PayeeMethodsView {
  const state = useSyncExternalStore(payeeStore.subscribe, payeeStore.getSnapshot);
  useEffect(() => {
    if (userId) payeeStore.ensureLoaded(userId);
  }, [userId]);
  if (!userId || state.status === 'idle' || state.userId !== userId)
    return { status: 'loading', methods: NONE, staleSince: null };
  if (state.status === 'ready')
    return {
      status: 'ready',
      methods: state.methods,
      staleSince: state.refreshFailed ? state.loadedAt : null,
    };
  return { status: state.status, methods: NONE, staleSince: null };
}

export function usePayeeAttention(userId: string | null) {
  const { methods } = usePayeeMethods(userId);
  return payeeAttention(methods, new Date())?.kind ?? null;
}
