import type { PublishFailure } from './types';

const BY_MESSAGE: Readonly<Record<string, PublishFailure>> = {
  publish_blocked: 'blocked',
  no_balance: 'noBalance',
  invalid_bounty: 'invalid',
};

const CHECK_VIOLATION = '23514';

export function toFailure(error: unknown): PublishFailure {
  if (typeof error !== 'object' || error === null) return 'failed';
  const { message, code } = error as { message?: unknown; code?: unknown };
  if (typeof message === 'string' && Object.hasOwn(BY_MESSAGE, message)) return BY_MESSAGE[message];
  if (code === CHECK_VIOLATION) return 'invalid';
  return 'failed';
}
