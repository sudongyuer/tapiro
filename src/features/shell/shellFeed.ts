import type { AccessoryItem } from './accessory';
import { createStore } from './store';

export type ShellFeedSnapshot = {
  accessory: readonly AccessoryItem[];
  unreadMessages: number;
};

export type ShellFeed = {
  getSnapshot: () => ShellFeedSnapshot;
  subscribe: (listener: () => void) => () => void;
  publish: (next: ShellFeedSnapshot) => void;
};

export const EMPTY_SHELL_FEED: ShellFeedSnapshot = { accessory: [], unreadMessages: 0 };

export function createShellFeed(initial: ShellFeedSnapshot = EMPTY_SHELL_FEED): ShellFeed {
  const store = createStore(initial);
  return { getSnapshot: store.get, subscribe: store.subscribe, publish: store.set };
}
