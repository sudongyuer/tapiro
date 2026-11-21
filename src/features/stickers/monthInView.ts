import { monthIndex, shiftMonth, type Month } from './calendar';

export type Span = { y: number; height: number };

export function monthInView(spans: readonly (Span | undefined)[], top: number, height: number) {
  let best = -1;
  let bestShown = 0;
  spans.forEach((span, index) => {
    if (!span) return;
    const shown = Math.min(span.y + span.height, top + height) - Math.max(span.y, top);
    if (shown > bestShown) {
      best = index;
      bestShown = shown;
    }
  });
  return best;
}

export function monthsBetween(first: Month, last: Month): Month[] {
  const count = Math.max(0, monthIndex(last) - monthIndex(first)) + 1;
  return Array.from({ length: count }, (_, offset) => shiftMonth(first, offset));
}
