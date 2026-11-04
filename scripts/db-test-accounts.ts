const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '[::1]', '::1']);

function localDbUrl() {
  const override = process.env.SUPABASE_LOCAL_DB_URL;
  if (override) return override;
  const status = Bun.spawnSync(['supabase', 'status', '-o', 'env']).stdout.toString();
  const found = status.match(/^DB_URL="([^"]+)"/m)?.[1];
  if (!found) throw new Error('Local Supabase is not running; start it with `bun run db:start`.');
  return found;
}

const dbUrl = localDbUrl();
const host = new URL(dbUrl).hostname.toLowerCase();
if (!LOCAL_HOSTS.has(host)) {
  console.error(`Refusing to seed test accounts into a non-local database (${host}).`);
  process.exit(1);
}

const SUMMARY = `select u.email, p.display_name,
  (select count(*) from public.payee_methods m where m.user_id = u.id) as payee_methods,
  (select coalesce(sum(delta), 0) from public.coin_ledger c where c.user_id = u.id) as coins
from auth.users u join public.profiles p on p.id = u.id
where u.email like '%@tapiro.test' order by u.email desc`;

function query(...args: string[]) {
  const result = Bun.spawnSync(['supabase', 'db', 'query', '--db-url', dbUrl, ...args], {
    stdout: 'inherit',
    stderr: 'inherit',
  });
  if (result.exitCode !== 0) process.exit(result.exitCode ?? 1);
}

query('--file', new URL('../supabase/dev/test-accounts.sql', import.meta.url).pathname);
query(SUMMARY);
