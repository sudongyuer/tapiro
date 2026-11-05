import type { ChatMember, ThreadInfo } from '../types';

export type SafetyKind = 'threadPeer' | 'groupMember' | 'rideOrganiser' | 'rideMember' | 'poster';

const BEFORE_DEPARTURE: ReadonlySet<string> = new Set(['open', 'gathering']);

export function peerOf(info: ThreadInfo): ChatMember | null {
  if (info.kind !== 'bounty') return null;
  return info.members.find((member) => !member.left) ?? info.members[0] ?? null;
}

export function blockKind(info: ThreadInfo, member: ChatMember): SafetyKind {
  if (info.kind === 'bounty') return 'threadPeer';
  if (member.left) return 'poster';
  const before = info.item.kind === 'ride' && BEFORE_DEPARTURE.has(info.item.status);
  if (!before) return 'groupMember';
  if (member.organiser) return 'rideOrganiser';
  const iOrganise = !info.members.some((other) => other.organiser);
  return iOrganise ? 'rideMember' : 'groupMember';
}

export function blockedFooter(info: ThreadInfo): ChatMember | null {
  if (info.left) return null;
  const peer = peerOf(info);
  return peer?.blockedByMe ? peer : null;
}

export type MenuPeople = {
  report: readonly ChatMember[];
  block: readonly ChatMember[];
  unblock: readonly ChatMember[];
};

export function menuPeople(info: ThreadInfo): MenuPeople {
  const people = info.kind === 'bounty' ? [peerOf(info)].filter((m) => m !== null) : info.members;
  return {
    report: people,
    block: people.filter((member) => !member.blockedByMe),
    unblock: people.filter((member) => member.blockedByMe),
  };
}
