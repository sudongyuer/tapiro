import type { StageActor } from '@/ui/MascotStage';

export function composeStageActor(growth: StageActor, feed: Partial<StageActor>): StageActor {
  if (!growth.onPress) return { ...growth, ...feed };
  return feed.overlay ? { ...growth, ...feed, wearStyle: undefined } : growth;
}
