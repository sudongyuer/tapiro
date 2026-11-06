import type { StageActor } from '@/ui/MascotStage';

export function composeStageActor(growth: StageActor, feed: Partial<StageActor>): StageActor {
  return growth.onPress && !feed.overlay ? growth : { ...growth, ...feed };
}
