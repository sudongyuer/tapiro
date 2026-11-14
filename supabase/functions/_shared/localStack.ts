export type Env = (key: string) => string | undefined;

const LOCAL_HOSTS = new Set(['kong', 'localhost', '127.0.0.1', '[::1]', 'host.docker.internal']);
const HOSTED_MARKERS = ['SB_REGION', 'DENO_DEPLOYMENT_ID'];
const CLI_DEMO_ISSUER = 'supabase-demo';

function hasLocalHost(supabaseUrl: string | undefined) {
  if (!supabaseUrl) return false;
  try {
    return LOCAL_HOSTS.has(new URL(supabaseUrl).hostname);
  } catch {
    return false;
  }
}

function issuer(jwt: string | undefined) {
  const part = jwt?.split('.')[1];
  if (!part) return null;
  try {
    const payload = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload?.iss === 'string' ? payload.iss : null;
  } catch {
    return null;
  }
}

// Three independent signs of the CLI's local stack, all required: a container-network or loopback URL; none of the
// variables Supabase sets only in hosted functions (https://supabase.com/docs/guides/functions/secrets, "In a hosted
// environment"; SB_EXECUTION_ID is set locally too, so it is not one of them); and the CLI's public demo service-role
// key, which a project reachable by others must not use. A VM given local.env and a kong URL still fails the third.
export function isLocalStack(env: Env) {
  return (
    hasLocalHost(env('SUPABASE_URL')) &&
    HOSTED_MARKERS.every((key) => !env(key)) &&
    issuer(env('SUPABASE_SERVICE_ROLE_KEY')) === CLI_DEMO_ISSUER
  );
}
