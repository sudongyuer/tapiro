import type { ActionResult } from './types';

type Sent<T> = Promise<ActionResult<T> | null>;

export async function askThenSend<T>(ask: () => Promise<boolean>, send: () => Sent<T>): Sent<T> {
  if (!(await ask())) return null;
  return send();
}

export async function previewThenSend<P, T>(
  preview: () => Sent<P>,
  ask: (preview: P) => Promise<boolean>,
  send: () => Sent<T>,
): Sent<T> {
  const answer = await preview();
  if (!answer?.ok) return null;
  return askThenSend(() => ask(answer.value), send);
}
