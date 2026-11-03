import { noticeRoute, type NoticeRoute } from './routes';
import type { NoticeData } from './types';

export type NoticeTap = { key: string; data: unknown };

export type NoticeTaps = {
  last(): Promise<NoticeTap | null>;
  listen(on: (tap: NoticeTap) => void): () => void;
  clear(): void;
};

export function toNoticeData(value: unknown): NoticeData | null {
  const body = value as Partial<NoticeData> | null | undefined;
  return typeof body?.kind === 'string' && typeof body.id === 'string' && body.id.length > 0
    ? { kind: body.kind, id: body.id }
    : null;
}

export function followNoticeTaps(
  taps: NoticeTaps,
  handled: Set<string>,
  open: ((route: NoticeRoute) => void) | null,
) {
  let following = true;
  const route = (tap: NoticeTap | null) => {
    if (!following || !tap || handled.has(tap.key)) return;
    handled.add(tap.key);
    taps.clear();
    if (!open) return;
    const data = toNoticeData(tap.data);
    const target = data ? noticeRoute(data) : null;
    if (target) open(target);
  };
  const stop = taps.listen(route);
  taps.last().then(route, () => undefined);
  return () => {
    following = false;
    stop();
  };
}

export function verifyNoticeTaps(argument: string | undefined): NoticeTaps {
  const [kind, ...id] = (argument ?? '').split(':');
  let pending: NoticeTap | null = argument
    ? { key: `verify:${argument}`, data: { kind, id: id.join(':') } }
    : null;
  return {
    last: async () => pending,
    listen: () => () => undefined,
    clear() {
      pending = null;
    },
  };
}
