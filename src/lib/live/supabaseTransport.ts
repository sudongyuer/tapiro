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

export function createSupabaseTransport(client: SupabaseClient | null): LiveTransport {
  return {
    open(userId, events) {
      if (!client) return () => undefined;
      const supabase: SupabaseClient = client;
      let closed = false;
      let channel: RealtimeChannel | null = null;
      const auth = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'TOKEN_REFRESHED' && session) {
          void supabase.realtime.setAuth(session.access_token);
        }
      });

      async function join() {
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
        auth.data.subscription.unsubscribe();
        if (channel) void supabase.removeChannel(channel);
      };
    },
  };
}
