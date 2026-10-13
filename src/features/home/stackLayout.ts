export const PEEK = 40;
export const STACK_GAP = 12;
export const MAX_STACKED = 3;
const SCALE_STEP = 0.05;

export type CardPlacement = { y: number; scale: number; visible: boolean };

export type StackLayout = {
  stacked: CardPlacement[];
  fanned: CardPlacement[];
  stackedHeight: number;
  fannedHeight: number;
};

export function stackLayout(heights: readonly number[]): StackLayout {
  const stacked: CardPlacement[] = [];
  let bottom = 0;
  heights.forEach((height, index) => {
    const layer = Math.min(index, MAX_STACKED - 1);
    if (index < MAX_STACKED) bottom = index === 0 ? height : Math.max(bottom + PEEK, height);
    stacked.push({
      y: bottom - height,
      scale: 1 - layer * SCALE_STEP,
      visible: index < MAX_STACKED,
    });
  });

  const fanned: CardPlacement[] = [];
  let top = 0;
  heights.forEach((height) => {
    fanned.push({ y: top, scale: 1, visible: true });
    top += height + STACK_GAP;
  });

  return {
    stacked,
    fanned,
    stackedHeight: bottom,
    fannedHeight: heights.length > 0 ? top - STACK_GAP : 0,
  };
}
