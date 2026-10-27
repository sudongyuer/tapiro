let close: (() => void) | null = null;

export function registerPostSheet(closeSheet: () => void) {
  close = closeSheet;
  return () => {
    if (close === closeSheet) close = null;
  };
}

export function closePostSheet() {
  const current = close;
  close = null;
  current?.();
  return current !== null;
}
