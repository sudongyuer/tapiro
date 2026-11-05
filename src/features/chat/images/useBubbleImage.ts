import { useEffect, useState, useSyncExternalStore } from 'react';

import { chatImages } from '../services';
import type { BubbleImage } from '../thread/threadView';
import type { ImageLoad } from './imageCache';
import { outboxUri } from './imageFiles';

const LOADING: ImageLoad = { status: 'loading' };

export function useBubbleImage(image: BubbleImage): ImageLoad & { shown: string | null } {
  const path = image.kind === 'stored' ? image.path : null;
  const load = useSyncExternalStore(chatImages.subscribe, () =>
    path ? chatImages.peek(path) : null,
  );
  useEffect(() => {
    if (path) chatImages.get(path);
  }, [path]);
  const current: ImageLoad =
    image.kind === 'local' ? { status: 'ready', uri: outboxUri(image.file) } : (load ?? LOADING);
  // While a just-sent image switches from its outbox file to the cached copy, the last drawn picture stays up
  // instead of flashing the placeholder.
  const [last, setLast] = useState<string | null>(null);
  const ready = current.status === 'ready' ? current.uri : null;
  if (ready && ready !== last) setLast(ready);
  return { ...current, shown: ready ?? last };
}
