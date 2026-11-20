import { SQL } from 'bun';

import { localSupabase } from './local-supabase';

let db: SQL | null = null;

// Fixtures go in as `postgres`, never through the service role: the service role holds only the grants the Edge
// Functions need, so a fixture written with it would either fail or need a grant that hides a missing one.
export function localDb() {
  db ??= new SQL(localSupabase('DB_URL'), { max: 1 });
  return db;
}
