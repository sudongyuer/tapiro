import type { SessionEnds } from '@/lib/sessionEnds';

import type { AuthService, SessionState } from './types';

const signedInId = (state: SessionState) =>
  state.status === 'signedIn' ? state.user.id : state.status === 'signedOut' ? null : undefined;

export function followSessionEnds(
  auth: Pick<AuthService, 'getState' | 'subscribe'>,
  ends: Pick<SessionEnds, 'observe'>,
) {
  const observe = () => {
    const userId = signedInId(auth.getState());
    if (userId !== undefined) ends.observe(userId);
  };
  observe();
  return auth.subscribe(observe);
}
