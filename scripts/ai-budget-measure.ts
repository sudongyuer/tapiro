import { createClient } from '@supabase/supabase-js';

import { proposedBudget, summarize, type MeterRow } from './ai-budget';
import prompts from './ai-budget-prompts.json';
import { localDb } from './local-db';
import { localSupabase } from './local-supabase';

const LOOPBACK = new Set(['127.0.0.1', 'localhost', '[::1]']);
const HAN = /\p{Script=Han}/u;

const url = localSupabase('API_URL');
if (!LOOPBACK.has(new URL(url).hostname)) {
  console.error(`ai-budget-measure runs against the local stack only, not ${url}`);
  process.exit(2);
}
const anonKey = localSupabase('ANON_KEY');
const admin = createClient(url, localSupabase('SERVICE_ROLE_KEY'), {
  auth: { persistSession: false },
});

async function main() {
  const email = `ai-budget-${crypto.randomUUID()}@example.test`;
  const password = `pw-${crypto.randomUUID()}`;
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error) throw created.error;
  const userId = created.data.user.id;
  try {
    const client = createClient(url, anonKey, { auth: { persistSession: false } });
    const signIn = await client.auth.signInWithPassword({ email, password });
    if (signIn.error) throw signIn.error;
    const consent = await client.rpc('record_consent', { version: 2 });
    if (consent.error) throw consent.error;

    const calls = [
      ...prompts.ask.map((text) => ({ task: 'ask', input: { text } })),
      ...prompts.translate.map((text) => ({
        task: 'translate',
        input: { text, to: HAN.test(text) ? 'en' : 'zh-Hans' },
      })),
    ];
    const outcomes: Record<string, number> = {};
    for (const body of calls) {
      await client.rpc('ai_status');
      await localDb()`update public.ai_energy set level = 1000 where user_id = ${userId}`;
      const started = performance.now();
      const response = await fetch(`${url}/functions/v1/ai-draft`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${signIn.data.session.access_token}`,
          apikey: anonKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      const answer = await response.json();
      const key = `${body.task} ${response.status} ${answer.tool ?? answer.error}`;
      outcomes[key] = (outcomes[key] ?? 0) + 1;
      console.log(`${key} ${Math.round(performance.now() - started)} ms`);
    }

    const rows = await localDb()`
      select task, model, input_tokens, output_tokens, discarded
      from public.ai_metering where user_id = ${userId}`;
    const summary = summarize([...rows] as MeterRow[]);
    console.log(JSON.stringify({ outcomes, summary, proposed: proposedBudget(summary) }, null, 2));
  } finally {
    await admin.auth.admin.deleteUser(userId);
    await localDb().close();
  }
}

await main();
