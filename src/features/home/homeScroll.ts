export function liveCardsOnScreen({
  offsetY,
  headerHeight,
  liveCardsBottom,
}: {
  offsetY: number;
  headerHeight: number;
  liveCardsBottom: number;
}) {
  return offsetY + headerHeight < liveCardsBottom;
}

export function createRestingOffset() {
  let resting: number | null = null;
  return {
    recordDragStart(offsetY: number) {
      if (resting === null) resting = offsetY;
    },
    get: () => resting,
  };
}
