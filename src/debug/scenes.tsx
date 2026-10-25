import type { ParseKeys } from 'i18next';
import type { ComponentType } from 'react';

import {
  DeleteBlockedScene,
  LanguageStepScene,
  ProfileSetupScene,
  SettingsScene,
  WelcomeScene,
} from './AccountScenes';
import { DesignTokensScene } from './DesignTokensScene';
import { PaySheetScene } from './PayScenes';
import { SignInScene } from './SignInScene';

export type Scene = {
  id: string;
  titleKey: ParseKeys;
  Component: ComponentType<{ onReady: () => void }>;
};

export const scenes: Scene[] = [
  { id: 'design-tokens', titleKey: 'debug.tokens.title', Component: DesignTokensScene },
  { id: 'sign-in', titleKey: 'debug.account.title', Component: SignInScene },
  { id: 'welcome', titleKey: 'debug.account.scenes.welcome', Component: WelcomeScene },
  {
    id: 'profile-setup',
    titleKey: 'debug.account.scenes.profileSetup',
    Component: ProfileSetupScene,
  },
  {
    id: 'language-step',
    titleKey: 'debug.account.scenes.languageStep',
    Component: LanguageStepScene,
  },
  { id: 'settings', titleKey: 'debug.account.scenes.settings', Component: SettingsScene },
  {
    id: 'delete-blocked',
    titleKey: 'debug.account.scenes.deleteBlocked',
    Component: DeleteBlockedScene,
  },
  { id: 'pay-sheet', titleKey: 'debug.pay.title', Component: PaySheetScene },
];

export function findScene(id: string) {
  return scenes.find((scene) => scene.id === id);
}
