import { createClient } from 'npm:@supabase/supabase-js@2';

import { localizedCopy } from './copy.ts';
import { handleNotify, type DuePush } from './handler.ts';
import { recordingSender } from './recording-sender.ts';

const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const admin = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

Deno.serve((req) =>
  handleNotify(req, {
    authorized: (token) => token === serviceKey,
    async claim(maxRows) {
      const { data, error } = await admin.rpc('claim_due_pushes', { max_rows: maxRows });
      if (error) throw error;
      return (data ?? []) as DuePush[];
    },
    async finish(queueId, error) {
      const result = await admin.rpc('finish_push', { queue_id: queueId, error });
      if (result.error) throw result.error;
    },
    async dropToken(token) {
      const { error } = await admin.rpc('drop_push_token', { token });
      if (error) throw error;
    },
    copy: localizedCopy,
    sender: recordingSender({ insert: (rows) => admin.from('recorded_pushes').insert(rows) }),
  }),
);
