let status: string | null = null;

const OVERRIDES = {
  API_URL: process.env.SUPABASE_LOCAL_API_URL,
  ANON_KEY: process.env.SUPABASE_LOCAL_ANON_KEY,
  SERVICE_ROLE_KEY: process.env.SUPABASE_LOCAL_SERVICE_ROLE_KEY,
};

// SUPABASE_LOCAL_<KEY> overrides `supabase status`, which reports the configured port even when another app holds it
// and the gateway listens elsewhere.
export function localSupabase(key: keyof typeof OVERRIDES) {
  const override = OVERRIDES[key];
  if (override) return override;
  status ??= Bun.spawnSync(['supabase', 'status', '-o', 'env']).stdout.toString();
  const found = status.match(new RegExp(`^${key}="([^"]+)"`, 'm'))?.[1];
  if (!found) throw new Error('Local Supabase is not running');
  return found;
}
