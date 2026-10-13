import { useSyncExternalStore } from 'react';

import { authService } from './authService';

export function useSession() {
  return useSyncExternalStore(authService.subscribe, authService.getState);
}
