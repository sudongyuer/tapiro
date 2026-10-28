import { useEffect, useState, useSyncExternalStore } from 'react';

import { boardService } from '../board/services';
import { bountyCache } from '../shared/bountyCache';
import { justApplied, type ApplySurface } from '../shared/justApplied';
import { createApplyFlow, createWithdrawFlow } from './applyFlow';
import { noteDrafts } from './noteDrafts';

export function useApply(id: string, surface: ApplySurface, onSent: () => void) {
  const [flow] = useState(() =>
    createApplyFlow(id, surface, {
      service: boardService,
      cache: bountyCache,
      justApplied,
      drafts: noteDrafts,
    }),
  );
  const state = useSyncExternalStore(flow.subscribe, flow.get);
  const sent = state.kind === 'sent';

  useEffect(() => {
    void flow.check();
  }, [flow]);

  useEffect(() => {
    if (sent) onSent();
  }, [sent, onSent]);

  return { state, send: flow.send };
}

export function posterName(id: string) {
  return bountyCache.row(id)?.poster.name ?? bountyCache.detail(id)?.poster.name ?? null;
}

export function useWithdraw(id: string, reload: () => void) {
  const [flow] = useState(() =>
    createWithdrawFlow(id, {
      service: boardService,
      cache: bountyCache,
      reload,
    }),
  );
  const state = useSyncExternalStore(flow.subscribe, flow.get);
  return { state, withdraw: flow.withdraw };
}
