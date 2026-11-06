import type { FeedState } from '../coinsStore';

export type FeedStep =
  'idle' | 'dropping' | 'waiting' | 'chewing' | 'fed' | 'alreadyFed' | 'failed';

export function feedStep({
  tapped,
  landed,
  chewed,
  feed,
}: {
  tapped: boolean;
  landed: boolean;
  chewed: boolean;
  feed: FeedState;
}): FeedStep {
  if (!tapped) return 'idle';
  if (!landed) return 'dropping';
  if (feed.phase === 'failed') return 'failed';
  if (feed.phase !== 'answered') return 'waiting';
  if (feed.status === 'already_fed') return 'alreadyFed';
  return chewed ? 'fed' : 'chewing';
}

export const feedAnswered = (step: FeedStep) =>
  step === 'fed' || step === 'alreadyFed' || step === 'failed';

export const FEED_LINES = {
  waiting: 'coins.feed.waiting',
  fed: 'coins.feed.fed',
  alreadyFed: 'coins.feed.alreadyFed',
  failed: 'coins.feed.failed',
} as const;
