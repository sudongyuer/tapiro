import { describe, expect, test } from 'bun:test';

import type { ChatMember, ThreadInfo } from '../types';
import { blockedFooter, blockKind, menuPeople } from './safetyView';

const person = (id: string, over: Partial<ChatMember> = {}): ChatMember => ({
  id,
  name: id,
  avatarUrl: null,
  left: false,
  blockedByMe: false,
  organiser: false,
  ...over,
});

const bounty = (members: ChatMember[], over: Partial<ThreadInfo> = {}): ThreadInfo => ({
  id: 't1',
  kind: 'bounty',
  itemId: 'b1',
  item: { kind: 'bounty', title: '帮取快递', category: 'pickup', art: null, status: 'assigned' },
  createdAt: '2026-11-06T00:00:00Z',
  left: false,
  unread: false,
  lastReadAt: null,
  peerReadAt: null,
  members,
  ...over,
});

const ride = (members: ChatMember[], status: 'open' | 'gathering' | 'departed'): ThreadInfo =>
  bounty(members, {
    kind: 'ride',
    item: { kind: 'ride', from: '双威', to: 'KLIA2', departsAt: '2026-11-06T10:00:00Z', status },
  });

describe('report and block in a thread', () => {
  test('a bounty thread offers its one peer, and the footer appears only once you blocked them', () => {
    const lin = person('lin');
    expect(menuPeople(bounty([lin]))).toEqual({ report: [lin], block: [lin], unblock: [] });
    expect(blockedFooter(bounty([lin]))).toBeNull();
    const blocked = person('lin', { blockedByMe: true });
    expect(menuPeople(bounty([blocked]))).toEqual({
      report: [blocked],
      block: [],
      unblock: [blocked],
    });
    expect(blockedFooter(bounty([blocked]))?.id).toBe('lin');
    expect(blockedFooter(bounty([blocked], { left: true }))).toBeNull();
  });

  test('the peer of a bounty thread is the member still in it', () => {
    const gone = person('old', { left: true });
    const now = person('new');
    expect(menuPeople(bounty([gone, now])).report).toEqual([now]);
  });

  test('a ride group offers every other member, split by whether you blocked them', () => {
    const mei = person('mei', { organiser: true });
    const arif = person('arif', { blockedByMe: true });
    expect(menuPeople(ride([mei, arif], 'open'))).toEqual({
      report: [mei, arif],
      block: [mei],
      unblock: [arif],
    });
  });

  test('the confirmation says who leaves when organiser and member block before 出发', () => {
    const mei = person('mei', { organiser: true });
    const arif = person('arif');
    expect(blockKind(bounty([arif]), arif)).toBe('threadPeer');
    expect(blockKind(ride([mei, arif], 'gathering'), mei)).toBe('rideOrganiser');
    expect(blockKind(ride([mei, arif], 'gathering'), arif)).toBe('groupMember');
    expect(blockKind(ride([arif], 'open'), arif)).toBe('rideMember');
    expect(blockKind(ride([mei, arif], 'departed'), mei)).toBe('groupMember');
    const gone = person('gone', { left: true });
    expect(blockKind(ride([gone], 'open'), gone)).toBe('poster');
  });
});
