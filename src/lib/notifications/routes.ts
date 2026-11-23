import type { NoticeData } from './types';

type ItemPath =
  '/bounty/[id]' | '/bounty/applicants/[id]' | '/bounty/status/[id]' | '/pay/[id]' | '/ride/[id]';

export type NoticeRoute =
  | { pathname: ItemPath; params: { id: string; notice?: 'expired' } }
  | { pathname: '/payee' }
  | { pathname: '/messages/[thread]'; params: { thread: string } };

const BOUNTY_ROUTES: Record<string, ItemPath> = {
  'bounty.applied': '/bounty/applicants/[id]',
  'bounty.withdrawn': '/bounty/applicants/[id]',
  'bounty.selected': '/bounty/status/[id]',
  'bounty.started': '/bounty/status/[id]',
  'bounty.eta_changed': '/bounty/status/[id]',
  'bounty.completed': '/bounty/status/[id]',
  'bounty.issue': '/bounty/status/[id]',
  'bounty.confirmed': '/bounty/status/[id]',
  'bounty.reviewed': '/bounty/status/[id]',
  'bounty.not_selected': '/bounty/[id]',
  'bounty.cancelled': '/bounty/[id]',
  'bounty.expired': '/bounty/[id]',
};

export function noticeRoute(data: NoticeData): NoticeRoute | null {
  const params = { id: data.id };
  const bounty = BOUNTY_ROUTES[data.kind];
  // The expiry goes to the poster and to pending applicants alike; the detail screen sends the poster on to
  // the applicants once it knows the viewer's role.
  if (bounty && data.kind === 'bounty.expired') {
    return { pathname: bounty, params: { ...params, notice: 'expired' } };
  }
  if (bounty) return { pathname: bounty, params };
  if (data.kind === 'payment.cant_pay') return { pathname: '/payee' };
  if (data.kind.startsWith('payment.')) return { pathname: '/pay/[id]', params };
  if (data.kind.startsWith('ride.')) return { pathname: '/ride/[id]', params };
  if (data.kind.startsWith('chat.')) {
    return { pathname: '/messages/[thread]', params: { thread: data.id } };
  }
  return null;
}
