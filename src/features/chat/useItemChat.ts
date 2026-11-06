import { useIsFocused } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';

import { useI18n } from '@/lib/i18n';

import { itemThreads } from './services';
import type { ThreadKind } from './types';

export type ItemChat = {
  open: (kind: ThreadKind, itemId: string) => void;
  opening: string | null;
};

export function useItemChat(navigate: (threadId: string) => void): ItemChat {
  const { t } = useI18n();
  const [opening, setOpening] = useState<string | null>(null);
  const busy = useRef(false);
  const focused = useIsFocused();
  const shown = useRef(focused);
  useEffect(() => {
    shown.current = focused;
    return () => {
      shown.current = false;
    };
  }, [focused]);
  const open = useCallback(
    (kind: ThreadKind, itemId: string) => {
      if (busy.current) return;
      const known = itemThreads.known(kind, itemId);
      if (known) return navigate(known);
      busy.current = true;
      setOpening(itemId);
      void itemThreads.lookup(kind, itemId).then((found) => {
        busy.current = false;
        setOpening(null);
        if (!shown.current) return;
        if (found.kind === 'found') return navigate(found.threadId);
        Alert.alert(t(found.kind === 'none' ? 'chat.entry.none' : 'chat.entry.failed'), undefined, [
          { text: t('chat.entry.ok') },
        ]);
      });
    },
    [navigate, t],
  );
  return { open, opening };
}
