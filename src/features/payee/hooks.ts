import { useEffect, useSyncExternalStore } from 'react';

import { firstRecheckDue, type PayeeMethod } from './methods';
import { payeeStore } from './services';

const NONE: PayeeMethod[] = [];

export function usePayeeMethods(userId: string | null) {
  const state = useSyncExternalStore(payeeStore.subscribe, payeeStore.getSnapshot);
  useEffect(() => {
    if (userId) payeeStore.ensureLoaded(userId);
  }, [userId]);
  if (!userId || state.status === 'idle' || state.userId !== userId)
    return { status: 'loading', methods: NONE } as const;
  if (state.status === 'ready') return { status: 'ready', methods: state.methods } as const;
  return { status: state.status, methods: NONE } as const;
}

export function usePayeeRecheckDue(userId: string | null) {
  const { methods } = usePayeeMethods(userId);
  return firstRecheckDue(methods, new Date()) !== null;
}
