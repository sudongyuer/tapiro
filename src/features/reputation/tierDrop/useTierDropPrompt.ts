import { useEffect, useRef } from 'react';

import { useTierDrop } from '../hooks';

export function useTierDropPrompt(canShow: boolean, open: () => void) {
  const drop = useTierDrop();
  const opened = useRef<number | null>(null);
  useEffect(() => {
    if (!drop || !canShow || opened.current === drop.id) return;
    opened.current = drop.id;
    open();
  }, [drop, canShow, open]);
}
