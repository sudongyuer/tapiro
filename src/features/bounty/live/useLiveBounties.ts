import { useEffect } from 'react';
import { AppState } from 'react-native';

import { liveBountyStore } from './services';

export function useLiveBounties(userId: string | null) {
  useEffect(() => liveBountyStore.follow(userId, AppState), [userId]);
}
