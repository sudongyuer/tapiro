import { useCallback, useState } from 'react';

import { useBoard } from './useBoard';
import { useOrigin } from './useOrigin';

function useTracked(run: () => Promise<void>) {
  const [busy, setBusy] = useState(false);
  const start = useCallback(async () => {
    setBusy(true);
    try {
      await run();
    } finally {
      setBusy(false);
    }
  }, [run]);
  return [busy, start] as const;
}

export function useBountyBoard(userId: string) {
  const { origin, evaluate } = useOrigin(userId);
  const board = useBoard(origin, evaluate);
  const [pulling, pull] = useTracked(board.refresh);
  const [retrying, retryRefresh] = useTracked(board.refresh);

  return { ...board, origin, pulling, pull, retryRefresh, retryBusy: retrying || board.refreshing };
}

export type BountyBoardModel = ReturnType<typeof useBountyBoard>;
