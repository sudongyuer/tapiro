export const CARD_EDGE = 12;
export const CARD_MAX_WIDTH = 340;
export const TAIL = 10;
export const PIN_SPAN = 72;
const GAP = 2;
const TAIL_INSET = 24;

type Size = { width: number; height: number };

export type CardPlacement = {
  left: number;
  top: number;
  side: 'above' | 'below';
  tailX: number;
  origin: { x: number; y: number };
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), Math.max(min, max));

export function cardWidth(mapWidth: number) {
  return Math.min(CARD_MAX_WIDTH, Math.max(0, mapWidth - CARD_EDGE * 2));
}

export function placeCard(pin: { x: number; y: number }, map: Size, card: Size): CardPlacement {
  const left = clamp(pin.x - card.width / 2, CARD_EDGE, map.width - CARD_EDGE - card.width);
  const tailX = clamp(pin.x - left, TAIL_INSET, card.width - TAIL_INSET);
  const above = pin.y - GAP - TAIL - card.height;
  const below = pin.y + PIN_SPAN + TAIL + GAP;
  const roomAbove = above - CARD_EDGE;
  const roomBelow = map.height - CARD_EDGE - (below + card.height);
  const side = roomAbove >= 0 || roomAbove >= roomBelow ? 'above' : 'below';
  const lowest = map.height - CARD_EDGE - card.height;
  const top = clamp(side === 'above' ? above : below, CARD_EDGE, lowest);
  return {
    left,
    top,
    side,
    tailX,
    origin: { x: tailX, y: side === 'above' ? card.height + TAIL : -TAIL },
  };
}

export type MoreChip = {
  shown: number;
  total: string;
  count: number;
  page: 'idle' | 'loading' | 'failed';
};

export function moreChip(
  state:
    | { kind: 'loading' | 'failed' }
    | {
        kind: 'ready';
        rows: readonly unknown[];
        total: number | null;
        next: unknown | null;
        page: 'idle' | 'loading' | 'failed';
      },
  pageSize: number,
): MoreChip | null {
  if (state.kind !== 'ready' || state.next === null) return null;
  const shown = state.rows.length;
  const left = state.total === null ? pageSize : Math.max(0, state.total - shown);
  return {
    shown,
    total: state.total === null ? `${shown}+` : String(state.total),
    count: Math.min(pageSize, Math.max(1, left)),
    page: state.page,
  };
}
