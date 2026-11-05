import { useIsFocused } from 'expo-router';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { ActionSheetIOS } from 'react-native';

import { useI18n } from '@/lib/i18n';

import { blockEvents } from './blockEvents';
import { createBlockFlow, createBlockList, createUnblockFlow } from './blockFlow';
import { blockService } from './services';
import type { BlockedPerson } from './types';

export type BlockKind =
  'poster' | 'applicant' | 'rideOrganiser' | 'rideMember' | 'threadPeer' | 'groupMember';

const BODY = {
  poster: 'block.confirm.body',
  applicant: 'block.confirm.applicantBody',
  rideOrganiser: 'block.confirm.rideBody',
  rideMember: 'block.confirm.rideMemberBody',
  threadPeer: 'block.confirm.threadBody',
  groupMember: 'block.confirm.groupBody',
} as const;

export type AskOutcome = 'cancelled' | 'blocked' | 'failed';
export type AskOptions = {
  kind?: BlockKind;
  title?: string;
  onSettled?: (outcome: AskOutcome) => void;
};

function useMounted() {
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  return mounted;
}

export function useBlockPerson(kind: BlockKind, onBlocked?: () => void) {
  const { t } = useI18n();
  const [flow] = useState(() =>
    createBlockFlow({ service: blockService, blocked: blockEvents.blocked }),
  );
  const state = useSyncExternalStore(flow.subscribe, flow.get);
  const [target, setTarget] = useState<string | null>(null);
  const mounted = useMounted();

  const ask = useCallback(
    (person: BlockedPerson, options: AskOptions = {}) => {
      if (flow.get() === 'busy') return;
      const name = person.name ?? t('bounty.post.unknownName');
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: options.title ?? t('block.confirm.title', { name }),
          message: t(BODY[options.kind ?? kind], { name }),
          options: [t('block.confirm.confirm'), t('block.confirm.cancel')],
          destructiveButtonIndex: 0,
          cancelButtonIndex: 1,
        },
        async (index) => {
          if (index !== 0) {
            if (mounted.current) options.onSettled?.('cancelled');
            return;
          }
          const blocking = flow.block(person.id);
          setTarget(flow.target());
          const blocked = await blocking;
          if (!mounted.current) return;
          if (blocked) onBlocked?.();
          options.onSettled?.(blocked ? 'blocked' : 'failed');
        },
      );
    },
    [flow, kind, mounted, onBlocked, t],
  );

  return { state, ask, target: state === 'busy' ? target : null };
}

export function useBlockPoster(onBlocked: () => void) {
  return useBlockPerson('poster', onBlocked);
}

export function useUnblockPerson() {
  const { t } = useI18n();
  const [flow] = useState(() =>
    createUnblockFlow({ service: blockService, unblocked: blockEvents.unblocked }),
  );
  const state = useSyncExternalStore(flow.subscribe, flow.get);

  const mounted = useMounted();

  const ask = useCallback(
    (person: BlockedPerson, onSettled?: (outcome: AskOutcome) => void) => {
      if (flow.get() === 'busy') return;
      const name = person.name ?? t('bounty.post.unknownName');
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: t('block.unblock.title', { name }),
          message: t('block.unblock.body', { name }),
          options: [t('block.unblock.confirm'), t('block.unblock.cancel')],
          cancelButtonIndex: 1,
        },
        async (index) => {
          if (index !== 0) return;
          const done = await flow.unblock(person.id);
          if (mounted.current) onSettled?.(done ? 'blocked' : 'failed');
        },
      );
    },
    [flow, mounted, t],
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
  const unblock = useCallback(
    async (id: string) => {
      if (await list.unblock(id)) blockEvents.unblocked(id);
    },
    [list],
  );
  return { state, retry: list.load, unblock };
}
