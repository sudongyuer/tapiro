import { useIsFocused } from 'expo-router';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { ActionSheetIOS } from 'react-native';

import { useI18n } from '@/lib/i18n';

import { blockEvents } from './blockEvents';
import { createBlockFlow, createBlockList } from './blockFlow';
import { blockService } from './services';
import type { BlockedPerson } from './types';

export type BlockKind = 'poster' | 'applicant' | 'rideOrganiser';

const BODY = {
  poster: 'block.confirm.body',
  applicant: 'block.confirm.applicantBody',
  rideOrganiser: 'block.confirm.rideBody',
} as const;

export function useBlockPerson(kind: BlockKind, onBlocked?: () => void) {
  const { t } = useI18n();
  const [flow] = useState(() =>
    createBlockFlow({ service: blockService, blocked: blockEvents.blocked }),
  );
  const state = useSyncExternalStore(flow.subscribe, flow.get);
  const [target, setTarget] = useState<string | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const ask = useCallback(
    (poster: BlockedPerson) => {
      if (flow.get() === 'busy') return;
      const name = poster.name ?? t('bounty.post.unknownName');
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: t('block.confirm.title', { name }),
          message: t(BODY[kind], { name }),
          options: [t('block.confirm.confirm'), t('block.confirm.cancel')],
          destructiveButtonIndex: 0,
          cancelButtonIndex: 1,
        },
        async (index) => {
          if (index !== 0) return;
          const blocking = flow.block(poster.id);
          setTarget(flow.target());
          if ((await blocking) && mounted.current) onBlocked?.();
        },
      );
    },
    [flow, kind, onBlocked, t],
  );

  return { state, ask, target: state === 'busy' ? target : null };
}

export function useBlockPoster(onBlocked: () => void) {
  return useBlockPerson('poster', onBlocked);
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
