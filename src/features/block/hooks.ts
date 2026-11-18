import { useIsFocused } from 'expo-router';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useI18n } from '@/lib/i18n';
import { askConfirm, type ConfirmAnchor } from '@/ui/confirm';

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

export type AskOutcome = 'cancelled' | 'blocked' | 'unblocked' | 'failed';
export type AskOptions = {
  kind?: BlockKind;
  title?: string;
  anchor?: ConfirmAnchor;
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

  const run = useCallback(
    async (person: BlockedPerson, options: AskOptions = {}) => {
      const blocking = flow.block(person.id);
      setTarget(flow.target());
      const blocked = await blocking;
      if (!mounted.current) return;
      if (blocked) onBlocked?.();
      options.onSettled?.(blocked ? 'blocked' : 'failed');
    },
    [flow, mounted, onBlocked],
  );

  const copy = useCallback(
    (person: BlockedPerson, options: AskOptions = {}) => {
      const name = person.name ?? t('bounty.post.unknownName');
      return {
        title: options.title ?? t('block.confirm.title', { name }),
        message: t(BODY[options.kind ?? kind], { name }),
        confirm: t('block.confirm.confirm'),
        keep: t('block.confirm.cancel'),
      };
    },
    [kind, t],
  );

  const ask = useCallback(
    (person: BlockedPerson, options: AskOptions = {}) => {
      if (flow.get() === 'busy') return;
      void askConfirm(copy(person, options), true, options.anchor ?? 'bar').then((sure) => {
        if (sure) return run(person, options);
        if (mounted.current) options.onSettled?.('cancelled');
      });
    },
    [copy, flow, mounted, run],
  );

  const confirmed = useCallback(
    (person: BlockedPerson) => {
      if (flow.get() !== 'busy') void run(person);
    },
    [flow, run],
  );

  return { state, ask, copy, confirmed, target: state === 'busy' ? target : null };
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
    (
      person: BlockedPerson,
      onSettled?: (outcome: AskOutcome) => void,
      anchor: ConfirmAnchor = 'bar',
    ) => {
      if (flow.get() === 'busy') return;
      const name = person.name ?? t('bounty.post.unknownName');
      void askConfirm(
        {
          title: t('block.unblock.title', { name }),
          message: t('block.unblock.body', { name }),
          confirm: t('block.unblock.confirm'),
          keep: t('block.unblock.cancel'),
        },
        false,
        anchor,
      ).then(async (sure) => {
        if (!sure) return;
        const done = await flow.unblock(person.id);
        if (mounted.current) onSettled?.(done ? 'unblocked' : 'failed');
      });
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
