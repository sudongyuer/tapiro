import type { ComponentType } from 'react';

import { DesignTokensScene } from './DesignTokensScene';

export type Scene = {
  id: string;
  titleKey: 'debug.tokens.title';
  Component: ComponentType<{ onReady: () => void }>;
};

export const scenes: Scene[] = [
  { id: 'design-tokens', titleKey: 'debug.tokens.title', Component: DesignTokensScene },
];

export function findScene(id: string) {
  return scenes.find((scene) => scene.id === id);
}
