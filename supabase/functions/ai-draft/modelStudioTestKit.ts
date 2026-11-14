export type Sent = { url: string; headers: Record<string, string>; body: Record<string, unknown> };

export type Scripted =
  { status: number; body: unknown } | { raw: string } | 'network_error' | 'hang';

export const ORIGIN = 'https://ws-test.ap-southeast-1.maas.aliyuncs.com';
export const API_KEY = 'sk-test-secret-key';

export function scriptedFetch(script: Scripted[]) {
  const sent: Sent[] = [];
  const run = async (input: string | URL | Request, init?: RequestInit) => {
    const headers = Object.fromEntries(new Headers(init?.headers).entries());
    sent.push({ url: String(input), headers, body: JSON.parse(String(init?.body)) });
    const next = script.shift();
    if (next === undefined) throw new Error('no scripted response left');
    if (next === 'network_error') throw new TypeError('connection refused');
    if (next === 'hang') {
      return await new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () =>
          reject(new DOMException('aborted', 'AbortError')),
        );
      });
    }
    if ('raw' in next) return new Response(next.raw, { status: 200 });
    return new Response(JSON.stringify(next.body), {
      status: next.status,
      headers: { 'Content-Type': 'application/json' },
    });
  };
  return { fetch: run as typeof fetch, sent };
}

export const ok = (body: unknown): Scripted => ({ status: 200, body });
