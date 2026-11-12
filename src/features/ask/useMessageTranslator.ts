import { useEffect, useMemo, useRef } from 'react';

import type { MessageTranslator } from '@/lib/translation';

import { translations } from './services';

export function useMessageTranslator(
  userId: string | null,
  open: { consent: () => void; sheet: () => void },
): MessageTranslator | null {
  const latest = useRef(open);
  useEffect(() => {
    latest.current = open;
  });
  return useMemo(
    () =>
      userId === null
        ? null
        : {
            subscribe: translations.subscribe,
            get: (messageId, to) => translations.get(userId, messageId, to),
            translate: (messageId, text, to) =>
              translations.translate(userId, messageId, text, to, () => latest.current.consent()),
            hide: (messageId, to) => translations.hide(userId, messageId, to),
            feed: () => latest.current.sheet(),
          },
    [userId],
  );
}
