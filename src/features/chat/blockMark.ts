import type { ChatState } from './chatStore';
import type { ThreadInfo } from './types';

function mark<T extends ThreadInfo>(info: T, personId: string, blocked: boolean): T {
  if (!info.members.some((member) => member.id === personId)) return info;
  return {
    ...info,
    members: info.members.map((member) =>
      member.id === personId ? { ...member, blockedByMe: blocked } : member,
    ),
    peerReadAt: blocked && info.kind === 'bounty' ? null : info.peerReadAt,
  };
}

export function withBlock(state: ChatState, personId: string, blocked: boolean): ChatState {
  const threads = Object.fromEntries(
    Object.entries(state.threads).map(([id, thread]) => {
      const info = thread.info && mark(thread.info, personId, blocked);
      return [id, info === thread.info ? thread : { ...thread, info }];
    }),
  );
  const list =
    state.list.status === 'idle'
      ? state.list
      : { ...state.list, threads: state.list.threads.map((row) => mark(row, personId, blocked)) };
  return { ...state, threads, list };
}
