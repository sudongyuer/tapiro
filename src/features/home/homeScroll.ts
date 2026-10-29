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

export function createTopRequest() {
  let pending = false;
  return {
    request(focused: boolean) {
      pending = !focused;
      return focused;
    },
    shown(closing: boolean) {
      if (closing || !pending) return false;
      pending = false;
      return true;
    },
    left() {
      pending = false;
    },
  };
}
