import { SQL } from 'bun';

import { localSupabase } from './local-supabase';

const LOOPBACK = new Set(['127.0.0.1', 'localhost', '[::1]', '::1']);

let db: SQL | null = null;

// Fixtures go in as `postgres`, never through the service role: the service role holds only the grants the Edge
// Functions need, so a fixture written with it would either fail or need a grant that hides a missing one.
export function localDb() {
  if (db) return db;
  const url = localSupabase('DB_URL');
  const host = new URL(url).hostname.toLowerCase();
  if (!LOOPBACK.has(host)) throw new Error(`localDb refuses a non-local database (${host})`);
  db = new SQL(url, { max: 1 });
  return db;
}

export async function closeLocalDb() {
  const open = db;
  db = null;
  await open?.close();
}
