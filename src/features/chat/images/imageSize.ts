export const BUBBLE_IMAGE = { maxWidth: 220, maxHeight: 280, minSide: 72, maxRatio: 3 } as const;

// Extreme shapes are cropped to at most 3:1 either way (the bubble shows the middle, the viewer the whole image). A
// small image is not blown up past half its pixel size, but never drawn smaller than a tappable square.
export function bubbleImageSize(width: number, height: number, limits = BUBBLE_IMAGE) {
  const ratio = Math.min(limits.maxRatio, Math.max(1 / limits.maxRatio, width / height));
  let w = limits.maxWidth;
  let h = w / ratio;
  if (h > limits.maxHeight) {
    h = limits.maxHeight;
    w = h * ratio;
  }
  const shrink = Math.min(1, Math.max(width, height) / 2 / Math.max(w, h));
  w *= shrink;
  h *= shrink;
  const grow = Math.max(1, limits.minSide / Math.min(w, h));
  return {
    width: Math.round(w * grow),
    height: Math.round(h * grow),
    cropped: ratio !== width / height,
  };
}
