export const CRON_SECRET_HEADER = 'x-cron-secret';

const encoder = new TextEncoder();

export function cronSecretCheck(expected: string | undefined) {
  if (!expected) console.error('CRON_SECRET is not set; every scheduled call is rejected');
  const want = encoder.encode(expected ?? '');
  return (given: string) => {
    if (want.length === 0) return false;
    const got = encoder.encode(given);
    let diff = got.length ^ want.length;
    for (let i = 0; i < want.length; i += 1) diff |= want[i] ^ (got[i] ?? 0);
    return diff === 0;
  };
}
