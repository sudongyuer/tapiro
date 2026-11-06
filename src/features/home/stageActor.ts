import type { StageActor } from '@/ui/MascotStage';

export function composeStageActor(growth: StageActor, feed: Partial<StageActor>): StageActor {
  return growth.onPress ? growth : { ...growth, ...feed };
}
