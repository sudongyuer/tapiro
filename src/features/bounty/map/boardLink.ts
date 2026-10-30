import { useEffect, useSyncExternalStore } from 'react';
import type { BountyMapCamera } from 'tapiro-kit';

import type { BountyBoardModel } from '../board/useBountyBoard';

export type LinkedBoard = { board: BountyBoardModel; onPost: () => void };

let linked: LinkedBoard | null = null;
let startRegion: BountyMapCamera | null = null;
const listeners = new Set<() => void>();

function publish(next: LinkedBoard | null) {
  linked = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const boardLink = {
  expandFrom(region: BountyMapCamera | null) {
    startRegion = region;
  },
  startRegion: () => startRegion,
};

export function usePublishBoard(board: BountyBoardModel, onPost: () => void) {
  useEffect(() => {
    publish({ board, onPost });
  });
  useEffect(
    () => () => {
      publish(null);
      startRegion = null;
    },
    [],
  );
}

export function useLinkedBoard() {
  return useSyncExternalStore(subscribe, () => linked);
}
