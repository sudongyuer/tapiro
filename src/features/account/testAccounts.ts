export type TestAccount = { key: 'xiaolin' | 'aming'; name: string; email: string };

export const TEST_ACCOUNTS: readonly TestAccount[] = [
  { key: 'xiaolin', name: '小林', email: 'xiaolin@tapiro.test' },
  { key: 'aming', name: '阿明', email: 'aming@tapiro.test' },
];

export const TEST_ACCOUNT_PASSWORD = 'tapiro-dev-only';

const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '[::1]']);

export function isLocalSupabaseUrl(url: string | undefined): boolean {
  if (!url) return false;
  const host = /^https?:\/\/([^/:?#]+|\[[^\]]+\])(?::\d+)?(?:[/?#]|$)/i.exec(url.trim())?.[1];
  return host !== undefined && LOCAL_HOSTS.has(host.toLowerCase());
}

export function testAccountsEnabled({
  dev,
  verify,
  supabaseUrl,
}: {
  dev: boolean;
  verify: boolean;
  supabaseUrl: string | undefined;
}): boolean {
  return dev && !verify && isLocalSupabaseUrl(supabaseUrl);
}
