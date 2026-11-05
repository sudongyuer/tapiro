import { useCallback } from 'react';

import { useBlockPerson, useUnblockPerson } from '@/features/block';

import type { ChatMember, ThreadInfo } from '../types';
import { blockKind } from './safetyView';
import type { MenuChoice } from './ThreadMenu';

const person = (member: ChatMember) => ({ id: member.id, name: member.name });

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

  const choose = useCallback(
    (choice: MenuChoice) => {
      if (!info) return;
      if (choice.kind === 'detail') return onOpenItem(info);
      if (choice.kind === 'report') return onReport({ userId: choice.member.id, messageId: null });
      if (choice.kind === 'unblock') return unblocking.ask(person(choice.member));
      blocking.ask(person(choice.member), { kind: blockKind(info, choice.member) });
    },
    [info, onOpenItem, onReport, blocking, unblocking],
  );

  return {
    choose,
    busy: blocking.state === 'busy' || unblocking.state === 'busy',
    blockFailed: blocking.state === 'failed',
    unblocking: unblocking.state === 'busy',
    unblockFailed: unblocking.state === 'failed',
    askUnblock: (member: ChatMember) => unblocking.ask(person(member)),
  };
}
