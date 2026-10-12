import type { ParseKeys } from 'i18next';
import type { ComponentType } from 'react';

import { DesignTokensScene } from './DesignTokensScene';
import { SignInScene } from './SignInScene';

export type Scene = {
  id: string;
  titleKey: ParseKeys;
  Component: ComponentType<{ onReady: () => void }>;
};

export const scenes: Scene[] = [
  { id: 'design-tokens', titleKey: 'debug.tokens.title', Component: DesignTokensScene },
  { id: 'sign-in', titleKey: 'debug.account.title', Component: SignInScene },
];

export function findScene(id: string) {
  return scenes.find((scene) => scene.id === id);
}
