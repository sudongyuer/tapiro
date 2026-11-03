import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';

import { toSignal } from './signal';
import type { ChannelStatus, LiveTransport } from './types';

const STATUSES: Record<string, ChannelStatus> = {
  SUBSCRIBED: 'joined',
  CHANNEL_ERROR: 'error',
  TIMED_OUT: 'error',
  CLOSED: 'closed',
};

export const userTopic = (userId: string) => `user:${userId}`;

export type LiveClient = Pick<SupabaseClient, 'auth' | 'realtime' | 'channel' | 'removeChannel'>;

export function createSupabaseTransport(client: LiveClient | null): LiveTransport {
  let leaving: Promise<unknown> = Promise.resolve();
  return {
    open(userId, events) {
      if (!client) return () => undefined;
      const supabase: LiveClient = client;
      let closed = false;
      let channel: RealtimeChannel | null = null;

      async function join() {
        await leaving.catch(() => undefined);
        const { data } = await supabase.auth.getSession();
        if (closed) return;
        if (!data.session) return events.status('closed');
        await supabase.realtime.setAuth(data.session.access_token);
        if (closed) return;
        channel = supabase
          .channel(userTopic(userId), { config: { private: true } })
          .on('broadcast', { event: '*' }, (message) => {
            const signal = toSignal(message);
            if (signal && !closed) events.signal(signal);
          })
          .subscribe((status) => {
            const mapped = STATUSES[status];
            if (mapped && !closed) events.status(mapped);
          });
      }

      join().catch(() => {
        if (!closed) events.status('closed');
      });

      return () => {
        closed = true;
        if (channel) leaving = supabase.removeChannel(channel);
      };
    },
  };
}
