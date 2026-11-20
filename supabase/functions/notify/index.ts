import { createClient } from 'npm:@supabase/supabase-js@2';

import { cronSecretCheck } from '../_shared/cronSecret.ts';
import { liveSender, localTestSender, senderFor, unconfiguredSender } from './config.ts';
import { localizedCopy } from './copy.ts';
import { handleNotify, type DuePush } from './handler.ts';
import { recordingSender } from './recording-sender.ts';

const env = (key: string) => Deno.env.get(key);
const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY')!;
const admin = createClient(env('SUPABASE_URL')!, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const authorized = cronSecretCheck(env('CRON_SECRET'));

const recording = recordingSender({ insert: (rows) => admin.from('recorded_pushes').insert(rows) });
const configured = (await liveSender(env)) ?? unconfiguredSender(env, recording);
const test = await localTestSender(env);

Deno.serve((req) =>
  handleNotify(req, {
    authorized,
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
    sender: senderFor(req, configured, test),
  }),
);
