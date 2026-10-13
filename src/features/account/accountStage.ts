import type { SessionState } from './types';

export type AccountStage = 'loading' | 'signedOut' | 'onboarding' | 'ready';

export function accountStage(session: SessionState, onboarded: ReadonlySet<string>): AccountStage {
  if (session.status !== 'signedIn') return session.status;
  return onboarded.has(session.user.id) ? 'ready' : 'onboarding';
}
