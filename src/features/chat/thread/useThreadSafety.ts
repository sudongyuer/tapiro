import { useCallback, useState } from 'react';

import { useBlockPerson, useUnblockPerson, type AskOutcome } from '@/features/block';

import type { ChatMember, ThreadInfo } from '../types';
import { blockKind } from './safetyView';
import type { MenuChoice } from './ThreadMenu';

const person = (member: ChatMember) => ({ id: member.id, name: member.name });

type Failure = 'block' | 'unblock' | null;

export function useThreadSafety({
  info,
  onOpenItem,
  onReport,
}: {
  info: ThreadInfo | null;
  onOpenItem: (info: ThreadInfo) => void;
  onReport: (target: { userId: string; messageId: string | null }) => void;
}) {
  const blocking = useBlockPerson('threadPeer');
  const unblocking = useUnblockPerson();
  const [failure, setFailure] = useState<Failure>(null);
  const settled = useCallback(
    (kind: 'block' | 'unblock') => (outcome: AskOutcome) =>
      setFailure(outcome === 'failed' ? kind : null),
    [],
  );

  const askUnblock = useCallback(
    (member: ChatMember) => {
      setFailure(null);
      unblocking.ask(person(member), settled('unblock'));
    },
    [unblocking, settled],
  );

  const choose = useCallback(
    (choice: MenuChoice) => {
      if (!info) return;
      setFailure(null);
      if (choice.kind === 'detail') return onOpenItem(info);
      if (choice.kind === 'report') return onReport({ userId: choice.member.id, messageId: null });
      if (choice.kind === 'unblock') return askUnblock(choice.member);
      blocking.ask(person(choice.member), {
        kind: blockKind(info, choice.member),
        onSettled: settled('block'),
      });
    },
    [info, onOpenItem, onReport, blocking, askUnblock, settled],
  );

  return {
    choose,
    askUnblock,
    busy: blocking.state === 'busy' || unblocking.state === 'busy',
    failure,
    unblocking: unblocking.state === 'busy',
  };
}
