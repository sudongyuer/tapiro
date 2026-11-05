import type { ChatState } from './chatStore';

export function badgeCount({ userId, unread }: Pick<ChatState, 'userId' | 'unread'>) {
  if (!userId || unread.status === 'idle') return 0;
  return unread.count;
}
