import { useIsFocused } from 'expo-router';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { ActionSheetIOS } from 'react-native';

import { useI18n } from '@/lib/i18n';

import { blockEvents } from '../shared/blockEvents';
import { createBlockFlow, createBlockList } from './blockFlow';
import { blockService } from './services';
import type { BlockedPerson } from './types';

export function useBlockPoster(onBlocked: () => void) {
  const { t } = useI18n();
  const [flow] = useState(() =>
    createBlockFlow({ service: blockService, blocked: blockEvents.blocked }),
  );
  const state = useSyncExternalStore(flow.subscribe, flow.get);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const ask = useCallback(
    (poster: BlockedPerson) => {
      const name = poster.name ?? t('bounty.post.unknownName');
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: t('bounty.block.confirm.title', { name }),
          message: t('bounty.block.confirm.body', { name }),
          options: [t('bounty.block.confirm.confirm'), t('bounty.block.confirm.cancel')],
          destructiveButtonIndex: 0,
          cancelButtonIndex: 1,
        },
        async (index) => {
          if (index === 0 && (await flow.block(poster.id)) && mounted.current) onBlocked();
        },
      );
    },
    [flow, onBlocked, t],
  );

  return { state, ask };
}

export function useBlockList() {
  const [list] = useState(() => createBlockList(blockService));
  const state = useSyncExternalStore(list.subscribe, list.get);
  const focused = useIsFocused();
  useEffect(() => {
    if (focused) void list.load();
  }, [focused, list]);
  return { state, retry: list.load, unblock: list.unblock };
}
