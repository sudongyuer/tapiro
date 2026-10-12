import { Settings } from 'react-native';

import type { OnboardedStorage } from './onboardingStore';

const KEY = 'tapiro.onboardedUsers';

export const settingsOnboardedStorage: OnboardedStorage = {
  read() {
    const value: unknown = Settings.get(KEY);
    return Array.isArray(value) ? value.filter((id) => typeof id === 'string') : [];
  },
  write(userIds) {
    Settings.set({ [KEY]: userIds });
  },
};
