import type { LiveSignal } from './types';

const KIND = /^[a-z]+\.[a-z_]+$/;

export function toSignal(message: unknown): LiveSignal | null {
  const body = (message as { payload?: unknown } | null)?.payload ?? message;
  const value = body as Partial<Record<keyof LiveSignal, unknown>> | null;
  if (typeof value?.kind !== 'string' || !KIND.test(value.kind)) return null;
  if (typeof value.id !== 'string' || value.id.length === 0) return null;
  return { kind: value.kind, id: value.id, at: typeof value.at === 'string' ? value.at : null };
}

export const matches = (signal: LiveSignal | null, prefixes: readonly string[]) =>
  signal === null || prefixes.some((prefix) => signal.kind.startsWith(prefix));
