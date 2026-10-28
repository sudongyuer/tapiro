import { useCallback, useState } from 'react';

import { useBoard } from './useBoard';
import { useOrigin } from './useOrigin';

export function useBountyBoard(userId: string) {
  const { origin, evaluate } = useOrigin(userId);
  const board = useBoard(origin, evaluate);
  const { refresh } = board;
  const [pulling, setPulling] = useState(false);

  const pull = useCallback(async () => {
    setPulling(true);
    try {
      await refresh();
    } finally {
      setPulling(false);
    }
  }, [refresh]);

  return { ...board, origin, pulling, pull };
}

export type BountyBoardModel = ReturnType<typeof useBountyBoard>;
