import { expect } from 'bun:test';

import { type AiDraftDeps, type BeginResult, type DiscardRow, type MeterRow } from './handler.ts';
import { fakeProvider, type AiProvider, type ProviderCall } from './provider.ts';

export const USER = '00000000-0000-4000-8000-00000000000a';
export const SECRET_PROMPT = '帮我取快递，我的手机号 0123456789';

export type Recorded = {
  begins: string[];
  finishes: MeterRow[];
  discards: DiscardRow[];
  aborts: string[];
  provider: ProviderCall[];
};

export function setup(overrides: Partial<AiDraftDeps> = {}, begin: BeginResult = okBegin(500)) {
  const recorded: Recorded = { begins: [], finishes: [], discards: [], aborts: [], provider: [] };
  const deps: AiDraftDeps = {
    userIdFromToken: async (token) => (token === 'valid' ? USER : null),
    store: {
      async begin(userId) {
        recorded.begins.push(userId);
        return begin;
      },
      async finish(row) {
        recorded.finishes.push(row);
        return { energy: 166, energyFull: 1000 };
      },
      async discard(row) {
        recorded.discards.push(row);
      },
      async abort(_userId, lease) {
        recorded.aborts.push(lease);
      },
    },
    provider: {
      generate(call, signal) {
        recorded.provider.push(call);
        return fakeProvider.generate(call, signal);
      },
    },
    ...overrides,
  };
  return { deps, recorded };
}

export function okBegin(energy: number): BeginResult {
  return { status: 'ok', lease: 'lease-1', energy, energyFull: 1000 };
}

export function post(body: unknown, token: string | null = 'valid') {
  return new Request('http://localhost/ai-draft', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

export const DRAFT = { task: 'draft_bounty', input: { text: SECRET_PROMPT } };
export const IMAGE = { mediaType: 'image/jpeg' as const, data: '/9j/4AAQSkZJRg==' };

export async function expectError(response: Response, status: number, error: string) {
  expect(await response.json()).toEqual({ error });
  expect(response.status).toBe(status);
}

export function replying(reply: Partial<Awaited<ReturnType<AiProvider['generate']>>>): AiProvider {
  return {
    async generate(call, signal) {
      return { ...(await fakeProvider.generate(call, signal)), ...reply };
    },
  };
}

export async function captureConsole(run: () => Promise<void>) {
  const lines: string[] = [];
  const original = { error: console.error, log: console.log, warn: console.warn };
  const capture = (...args: unknown[]) => void lines.push(args.map(String).join(' '));
  Object.assign(console, { error: capture, log: capture, warn: capture });
  try {
    await run();
  } finally {
    Object.assign(console, original);
  }
  return lines;
}
